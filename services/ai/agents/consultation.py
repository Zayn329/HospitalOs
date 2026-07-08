import os
import json
from typing import TypedDict, List
from fastapi import APIRouter
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END

router = APIRouter(prefix="/consultation", tags=["consultation"])

# State Definition
class AgentState(TypedDict):
    symptoms: List[str]
    findings: str
    treatment: str
    allergies: List[str]
    proposed_medications: List[str]
    soap_notes: dict
    warnings: List[str]

# API Schemas
class AllergyCheckRequest(BaseModel):
    allergies: List[str]
    medications: List[str]

class AllergyCheckResponse(BaseModel):
    warnings: List[str]
    isConflict: bool

class SoapNotesRequest(BaseModel):
    symptoms: List[str]
    findings: str
    treatment: str

class SoapNotesResponse(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str

# 1. Allergy Checker Node
def check_allergies_node(state: AgentState) -> dict:
    allergies = state.get("allergies", [])
    meds = state.get("proposed_medications", [])
    warnings = []
    
    if not allergies or not meds:
        return {"warnings": []}
        
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.1
            )
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are a Clinical Pharmacist Assistant. Analyze the patient's listed drug allergies "
                    "against the proposed medications list. Identify any direct matches, cross-reactivity, or class warnings "
                    "(e.g., Penicillin allergy warning when prescribing Amoxicillin, NSAID allergy warning for Ibuprofen, etc.).\n\n"
                    "Patient Allergies: {allergies}\n"
                    "Proposed Medications: {meds}\n\n"
                    "Respond with a JSON block containing key: 'warnings' (array of strings explaining conflicts). "
                    "If no conflicts are found, return an empty array. Do not output markdown code blocks."
                ))
            ])
            chain = prompt | llm
            response = chain.invoke({"allergies": ", ".join(allergies), "meds": ", ".join(meds)})
            content = response.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            return {"warnings": data.get("warnings", [])}
        except Exception as e:
            print(f"Gemini allergy check failed: {e}")
            
    # Fallback local logic
    for med in meds:
        med_lower = med.lower()
        for allergy in allergies:
            all_lower = allergy.lower()
            
            if all_lower in med_lower or med_lower in all_lower:
                warnings.append(f"Direct match conflict: Prescribed medication '{med}' matches patient allergen '{allergy}'.")
            elif "penicillin" in all_lower and ("amoxicillin" in med_lower or "ampicillin" in med_lower or "cillin" in med_lower):
                warnings.append(f"Class Cross-Reactivity: Prescribed penicillin-derivative '{med}' to a patient allergic to '{allergy}'.")
            elif "nsaid" in all_lower and ("ibuprofen" in med_lower or "aspirin" in med_lower or "naproxen" in med_lower):
                warnings.append(f"Class Warning: Prescribed NSAID '{med}' to a patient allergic to '{allergy}'.")
                
    return {"warnings": warnings}

# 2. Scribe Node
def generate_soap_node(state: AgentState) -> dict:
    symptoms = state.get("symptoms", [])
    findings = state.get("findings", "")
    treatment = state.get("treatment", "")
    
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.1
            )
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are a Clinical Medical Scribe. Restructure the patient's symptoms, doctor findings, "
                    "and treatment plan into the standard medical SOAP notes format:\n"
                    "- Subjective: patient reported symptoms and history.\n"
                    "- Objective: vital signs, observation, clinical findings.\n"
                    "- Assessment: diagnosis and clinical reasoning.\n"
                    "- Plan: medications, instructions, follow-up.\n\n"
                    "Symptoms: {symptoms}\n"
                    "Findings: {findings}\n"
                    "Treatment: {treatment}\n\n"
                    "Respond with a JSON block containing keys: 'subjective', 'objective', 'assessment', 'plan'. "
                    "Do NOT use markdown code blocks. Respond with pure JSON."
                ))
            ])
            chain = prompt | llm
            response = chain.invoke({
                "symptoms": ", ".join(symptoms),
                "findings": findings,
                "treatment": treatment
            })
            content = response.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            return {"soap_notes": data}
        except Exception as e:
            print(f"Gemini SOAP note generation failed: {e}")
            
    # Fallback local parsing
    soap = {
        "subjective": f"Patient reports symptoms of: {', '.join(symptoms) if symptoms else 'Not documented'}.",
        "objective": f"Clinical findings recorded: {findings if findings else 'Not documented'}.",
        "assessment": "Patient presenting with symptoms matching clinical findings. Requires observation.",
        "plan": f"Treatment plan outline: {treatment if treatment else 'Not documented'}."
    }
    return {"soap_notes": soap}

# Build LangGraph Workflow
workflow = StateGraph(AgentState)
workflow.add_node("allergy_check", check_allergies_node)
workflow.add_node("soap_generation", generate_soap_node)

workflow.set_entry_point("allergy_check")
workflow.add_edge("allergy_check", "soap_generation")
workflow.add_edge("soap_generation", END)

compiled_graph = workflow.compile()

# Route Handlers
@router.post("/allergy-check", response_model=AllergyCheckResponse)
def api_allergy_check(payload: AllergyCheckRequest):
    initial_state = {
        "symptoms": [],
        "findings": "",
        "treatment": "",
        "allergies": payload.allergies,
        "proposed_medications": payload.medications,
        "soap_notes": {},
        "warnings": []
    }
    result = compiled_graph.invoke(initial_state)
    warnings = result.get("warnings", [])
    return AllergyCheckResponse(warnings=warnings, isConflict=len(warnings) > 0)

@router.post("/soap-notes", response_model=SoapNotesResponse)
def api_soap_notes(payload: SoapNotesRequest):
    initial_state = {
        "symptoms": payload.symptoms,
        "findings": payload.findings,
        "treatment": payload.treatment,
        "allergies": [],
        "proposed_medications": [],
        "soap_notes": {},
        "warnings": []
    }
    result = compiled_graph.invoke(initial_state)
    soap = result.get("soap_notes", {})
    return SoapNotesResponse(
        subjective=soap.get("subjective", ""),
        objective=soap.get("objective", ""),
        assessment=soap.get("assessment", ""),
        plan=soap.get("plan", "")
    )

class EnhanceNotesRequest(BaseModel):
    symptoms: List[str]
    findings: str
    treatment: str

@router.post("/enhance", response_model=SoapNotesResponse)
def api_enhance_notes(payload: EnhanceNotesRequest):
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.2
            )
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are a Clinical Documentation Enhancement Expert. Take the patient symptoms, "
                    "findings, and treatment plan, and refine them into highly professional, polished, and structured clinical SOAP notes. "
                    "Use advanced clinical terminology, clear syntax, and correct billing-ready phrasing.\n\n"
                    "Symptoms: {symptoms}\n"
                    "Findings: {findings}\n"
                    "Treatment: {treatment}\n\n"
                    "Respond with a JSON block containing keys: 'subjective', 'objective', 'assessment', 'plan'. "
                    "Do NOT use markdown code blocks. Respond with pure JSON."
                ))
            ])
            chain = prompt | llm
            response = chain.invoke({
                "symptoms": ", ".join(payload.symptoms),
                "findings": payload.findings,
                "treatment": payload.treatment
            })
            content = response.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            return SoapNotesResponse(
                subjective=data.get("subjective", ""),
                objective=data.get("objective", ""),
                assessment=data.get("assessment", ""),
                plan=data.get("plan", "")
            )
        except Exception as e:
            print(f"Gemini enhancement failed: {e}")
            
    return SoapNotesResponse(
        subjective=f"Clinical Narrative: Patient presents reporting {', '.join(payload.symptoms)}.",
        objective=f"Objective Evaluation: Physical exam shows {payload.findings}.",
        assessment=f"Clinical Assessment: Findings support patient report of diagnostic concern.",
        plan=f"Therapeutic Plan: Advise following up with: {payload.treatment}."
    )
