import os
import json
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from agents.llm import call_llm

router = APIRouter(prefix="/billing", tags=["billing"])

# Schemas
class BillingExplanationRequest(BaseModel):
    diagnosis: str
    treatment_plan: str
    medications: List[str]
    consultation_fee: float
    total_amount: float

class BillingExplanationResponse(BaseModel):
    explanation: str

class InsuranceClaimRequest(BaseModel):
    insurance_provider: str
    policy_number: str
    diagnosis: str
    treatment_plan: str
    medications: List[str]
    total_amount: float

class InsuranceClaimResponse(BaseModel):
    is_covered: bool
    coverage_details: str
    approved_amount: float
    explanation: str

# 1. Explain Billing Items Route
@router.post("/explain", response_model=BillingExplanationResponse)
def explain_billing(payload: BillingExplanationRequest):
    try:
        system_prompt = (
            "You are a Hospital Billing Advisor. Provide a clear, polite, and detailed markdown explanation "
            "for the patient's hospital bill based on the consultation services and prescribed medications.\n\n"
            f"Diagnosis: {payload.diagnosis}\n"
            f"Treatment Plan: {payload.treatment_plan}\n"
            f"Prescribed Medications: {', '.join(payload.medications)}\n"
            f"Consultation Fee: ${payload.consultation_fee:.2f}\n"
            f"Total Bill Amount: ${payload.total_amount:.2f}\n\n"
            "Explain what the consultation fee covers, how medication costs are factored in, and the "
            "final cost. Format it beautifully with bullet points."
        )
        content = call_llm(system_prompt, temperature=0.2)
        return BillingExplanationResponse(explanation=content.strip())
    except Exception as e:
        print(f"Groq billing explanation failed: {e}")

    # Fallback explanation
    fallback = (
        f"### Hospital Bill Breakdown\n\n"
        f"* **Consultation Fee**: ${payload.consultation_fee:.2f} (Standard professional consultation for {payload.diagnosis})\n"
        f"* **Medications prescribed**: {', '.join(payload.medications) if payload.medications else 'None'}\n"
        f"* **Total Amount Charged**: ${payload.total_amount:.2f}\n\n"
        f"If you have any questions, please contact the billing department."
    )
    return BillingExplanationResponse(explanation=fallback)

# 2. Verify Insurance Route
@router.post("/verify-insurance", response_model=InsuranceClaimResponse)
def verify_insurance(payload: InsuranceClaimRequest):
    try:
        system_prompt = (
            "You are an Insurance Coordination Specialist. Evaluate the coverage of a hospital bill "
            "against the patient's insurance details. Generate a logical insurance claim approval or rejection recommendation.\n\n"
            f"Insurance Provider: {payload.insurance_provider}\n"
            f"Policy Number: {payload.policy_number}\n"
            f"Diagnosis/Reason: {payload.diagnosis}\n"
            f"Treatment/Medications: {payload.treatment_plan} / {', '.join(payload.medications)}\n"
            f"Total Bill: ${payload.total_amount:.2f}\n\n"
            "Respond with a JSON block containing key attributes:\n"
            "- 'is_covered': boolean (true if policy is active and covers this condition/care, false if not)\n"
            "- 'coverage_details': string explaining what is covered\n"
            "- 'approved_amount': float (the amount covered by insurance, e.g. 80-100% of bill, or 0 if rejected)\n"
            "- 'explanation': string explaining the decision reason.\n\n"
            "Do NOT use markdown code blocks. Respond with pure JSON."
        )
        content = call_llm(system_prompt, temperature=0.1)
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return InsuranceClaimResponse(
            is_covered=data.get("is_covered", True),
            coverage_details=data.get("coverage_details", "Standard medical coverage active"),
            approved_amount=data.get("approved_amount", payload.total_amount * 0.8),
            explanation=data.get("explanation", "Claim approved according to policy guidelines.")
        )
    except Exception as e:
        print(f"Groq insurance verification failed: {e}")

    # Fallback local simulation logic
    is_covered = not payload.insurance_provider.lower().startswith("uncovered")
    approved_amount = payload.total_amount * 0.8 if is_covered else 0.0
    explanation = (
        f"Claim approved under standard 80% co-insurance for policy {payload.policy_number}."
        if is_covered else
        f"Insurance provider '{payload.insurance_provider}' did not authorize this claim."
    )
    return InsuranceClaimResponse(
        is_covered=is_covered,
        coverage_details="Standard PPO 80/20 Co-insurance" if is_covered else "No coverage",
        approved_amount=approved_amount,
        explanation=explanation
    )
