import os
import json
from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from agents.llm import call_llm

router = APIRouter(prefix="/patient-care", tags=["patient-care"])

# Schemas
class DischargeInstructionsRequest(BaseModel):
    diagnosis: str
    treatment_plan: str
    medications: List[str]

class DischargeInstructionsResponse(BaseModel):
    discharge_instructions: str
    follow_up_recommendations: str

# 1. Generate Discharge Instructions Route
@router.post("/discharge-instructions", response_model=DischargeInstructionsResponse)
def generate_discharge_instructions(payload: DischargeInstructionsRequest):
    try:
        system_prompt = (
            "You are a Clinical Care Transition Specialist. Create detailed and clear post-discharge patient instructions "
            "and follow-up care recommendations based on the patient's consultation information.\n\n"
            f"Diagnosis: {payload.diagnosis}\n"
            f"Treatment/Medications Plan: {payload.treatment_plan} / {', '.join(payload.medications)}\n\n"
            "Respond with a JSON block containing key attributes:\n"
            "- 'discharge_instructions': string (care guidelines, diet, activity limits, medication instructions, and warning signs/red flags to seek immediate care)\n"
            "- 'follow_up_recommendations': string (when and who to follow up with, e.g. 'Follow up with primary care physician in 7-10 days')\n\n"
            "Do NOT use markdown code blocks. Respond with pure JSON."
        )
        content = call_llm(system_prompt, temperature=0.2)
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return DischargeInstructionsResponse(
            discharge_instructions=data.get("discharge_instructions", "Take medications as directed and monitor symptoms."),
            follow_up_recommendations=data.get("follow_up_recommendations", "Follow up with your doctor in 7 days.")
        )
    except Exception as e:
        print(f"Groq discharge instructions generation failed: {e}")

    # Fallback explanation
    fallback_instructions = (
        f"1. Activity: Rest as tolerated. Resume normal activities gradually.\n"
        f"2. Diet: Drink plenty of fluids and maintain a balanced diet.\n"
        f"3. Medications: Take all prescribed medications ({', '.join(payload.medications) if payload.medications else 'None'}) exactly as directed.\n"
        f"4. Warning Signs: Seek immediate medical care if you experience high fever, worsening pain, shortness of breath, or severe swelling."
    )
    fallback_followup = "Please follow up with your doctor or clinical team in 1 week for re-evaluation."
    return DischargeInstructionsResponse(
        discharge_instructions=fallback_instructions,
        follow_up_recommendations=fallback_followup
    )
