import os
import json
from typing import TypedDict, List
from fastapi import APIRouter
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END

router = APIRouter(prefix="/medication-safety", tags=["medication-safety"])

# State Definition
class AgentState(TypedDict):
    allergies: List[str]
    current_medications: List[str]
    proposed_medications: List[str]
    warnings: List[str]

# API Schemas
class MedicationSafetyRequest(BaseModel):
    allergies: List[str]
    medications: List[str]
    current_medications: List[str] = []

class MedicationSafetyResponse(BaseModel):
    warnings: List[str]
    isConflict: bool

# 1. Allergy Checker Node
def check_allergies_node(state: AgentState) -> dict:
    allergies = state.get("allergies", [])
    proposed_meds = state.get("proposed_medications", [])
    warnings = list(state.get("warnings", []))
    
    if not allergies or not proposed_meds:
        return {"warnings": warnings}
        
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
                    "Proposed Medications: {proposed_meds}\n\n"
                    "Respond with a JSON block containing key: 'warnings' (array of strings explaining conflicts). "
                    "If no conflicts are found, return an empty array. Do not output markdown code blocks."
                ))
            ])
            chain = prompt | llm
            response = chain.invoke({"allergies": ", ".join(allergies), "proposed_meds": ", ".join(proposed_meds)})
            content = response.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            warnings.extend(data.get("warnings", []))
            return {"warnings": warnings}
        except Exception as e:
            print(f"Gemini allergy check failed: {e}")
            
    # Fallback local logic
    for med in proposed_meds:
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

# 2. Drug-Drug Interaction Checker Node
def check_interactions_node(state: AgentState) -> dict:
    current_meds = state.get("current_medications", [])
    proposed_meds = state.get("proposed_medications", [])
    warnings = list(state.get("warnings", []))
    
    if not current_meds or not proposed_meds:
        return {"warnings": warnings}
        
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
                    "You are a Clinical Pharmacist Assistant. Analyze the proposed medications list "
                    "against the patient's current medications list. Identify any clinical drug-drug interactions, "
                    "potentiations, or severe contraindications (e.g., Warfarin + Aspirin bleeding risk, etc.).\n\n"
                    "Current Medications: {current_meds}\n"
                    "Proposed Medications: {proposed_meds}\n\n"
                    "Respond with a JSON block containing key: 'warnings' (array of strings explaining conflicts/interactions). "
                    "If no conflicts are found, return an empty array. Do not output markdown code blocks."
                ))
            ])
            chain = prompt | llm
            response = chain.invoke({"current_meds": ", ".join(current_meds), "proposed_meds": ", ".join(proposed_meds)})
            content = response.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            warnings.extend(data.get("warnings", []))
            return {"warnings": warnings}
        except Exception as e:
            print(f"Gemini drug interaction check failed: {e}")
            
    # Fallback local logic
    for med in proposed_meds:
        med_lower = med.lower()
        for curr in current_meds:
            curr_lower = curr.lower()
            
            # Warfarin + Aspirin / Ibuprofen interaction (bleeding risk)
            if "warfarin" in curr_lower and ("aspirin" in med_lower or "ibuprofen" in med_lower):
                warnings.append(f"Drug-Drug Interaction: Prescribing '{med}' alongside '{curr}' increases bleeding risk.")
            elif "warfarin" in med_lower and ("aspirin" in curr_lower or "ibuprofen" in curr_lower):
                warnings.append(f"Drug-Drug Interaction: Prescribing '{med}' alongside '{curr}' increases bleeding risk.")
                
            # Lisinopril + Spironolactone (hyperkalemia risk)
            elif "lisinopril" in curr_lower and "spironolactone" in med_lower:
                warnings.append(f"Drug-Drug Interaction: Prescribing '{med}' alongside '{curr}' increases hyperkalemia risk.")
            elif "lisinopril" in med_lower and "spironolactone" in curr_lower:
                warnings.append(f"Drug-Drug Interaction: Prescribing '{med}' alongside '{curr}' increases hyperkalemia risk.")
                
    return {"warnings": warnings}

# 3. Duplicate Medication Checker Node
def check_duplicates_node(state: AgentState) -> dict:
    current_meds = state.get("current_medications", [])
    proposed_meds = state.get("proposed_medications", [])
    warnings = list(state.get("warnings", []))
    
    if not current_meds or not proposed_meds:
        return {"warnings": warnings}
        
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
                    "You are a Clinical Pharmacist Assistant. Analyze the proposed medications list "
                    "against the patient's current medications list. Identify any therapeutic duplications or drug duplicates "
                    "(e.g., prescribing two NSAIDs like Ibuprofen and Naproxen, or prescribing the same drug again under a different brand/strength).\n\n"
                    "Current Medications: {current_meds}\n"
                    "Proposed Medications: {proposed_meds}\n\n"
                    "Respond with a JSON block containing key: 'warnings' (array of strings explaining duplication conflicts). "
                    "If no conflicts are found, return an empty array. Do not output markdown code blocks."
                ))
            ])
            chain = prompt | llm
            response = chain.invoke({"current_meds": ", ".join(current_meds), "proposed_meds": ", ".join(proposed_meds)})
            content = response.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            warnings.extend(data.get("warnings", []))
            return {"warnings": warnings}
        except Exception as e:
            print(f"Gemini duplication check failed: {e}")
            
    # Fallback local logic
    for med in proposed_meds:
        med_clean = med.split()[0].lower() if med.strip() else ""
        if not med_clean:
            continue
        for curr in current_meds:
            curr_clean = curr.split()[0].lower() if curr.strip() else ""
            if not curr_clean:
                continue
                
            # Direct duplicates
            if med_clean == curr_clean:
                warnings.append(f"Duplicate Medication: Patient is already prescribed '{curr}' which duplicates proposed '{med}'.")
                
            # Class duplicates (e.g. Ibuprofen and Naproxen)
            elif (med_clean in ["ibuprofen", "naproxen", "aspirin"]) and (curr_clean in ["ibuprofen", "naproxen", "aspirin"]):
                warnings.append(f"Therapeutic Duplication: Both '{med}' and '{curr}' are NSAIDs. Avoid co-prescribing.")
                
    return {"warnings": warnings}

# Build LangGraph Workflow
workflow = StateGraph(AgentState)
workflow.add_node("check_allergies", check_allergies_node)
workflow.add_node("check_interactions", check_interactions_node)
workflow.add_node("check_duplicates", check_duplicates_node)

workflow.set_entry_point("check_allergies")
workflow.add_edge("check_allergies", "check_interactions")
workflow.add_edge("check_interactions", "check_duplicates")
workflow.add_edge("check_duplicates", END)

compiled_graph = workflow.compile()

# Route Handler
@router.post("/check", response_model=MedicationSafetyResponse)
def check_medication_safety(payload: MedicationSafetyRequest):
    initial_state = {
        "allergies": payload.allergies,
        "current_medications": payload.current_medications,
        "proposed_medications": payload.medications,
        "warnings": []
    }
    result = compiled_graph.invoke(initial_state)
    warnings = result.get("warnings", [])
    return MedicationSafetyResponse(warnings=warnings, isConflict=len(warnings) > 0)
