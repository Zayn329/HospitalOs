import json
import logging
from typing import Dict, Any, List
from .llm import call_llm

logger = logging.getLogger("medikiosk_agent")

def generate_hybrid_questions(chief_complaint: str, mode: str = "allopathy", language: str = "en") -> Dict[str, Any]:
    """
    Generates dynamic clinical intake questions using a hybrid LLM + SOCRATES / AYUSH framework.
    """
    system_prompt = (
        "You are an expert clinical intake AI assistant for an outpatient hospital kiosk.\n"
        "Your goal is to take a patient's chief complaint and generate 3-5 precise, adaptive follow-up questions.\n"
        "If mode is 'allopathy', structure questions following the SOCRATES clinical framework (Site, Onset, Character, Radiation, Associations, Timing, Exacerbating factors, Severity).\n"
        "If mode is 'ayush', structure questions following Ayurvedic Dashavidha Pariksha (Prakriti, Agni, Koshtha, Ahara-Vihara).\n"
        "Respond ONLY in valid JSON matching this schema:\n"
        "{\n"
        '  "adaptiveQuestions": [\n'
        '    { "id": "site", "question": "Question text...", "options": ["Option 1", "Option 2", "Option 3"] }\n'
        '  ]\n'
        "}"
    )

    user_prompt = f"Patient Chief Complaint: '{chief_complaint}'\nLanguage: '{language}'\nMode: '{mode}'"

    try:
        raw_response = call_llm(system_prompt, user_prompt, temperature=0.1)
        # Parse JSON
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_response:
            raw_response = raw_response.split("```")[1].split("```")[0].strip()

        data = json.loads(raw_response)
        return data
    except Exception as e:
        logger.warning(f"Groq LLM call failed or unavailable ({e}). Using deterministic medical fallback.")
        # Deterministic Fallback
        if mode == "ayush":
            return {
                "adaptiveQuestions": [
                    { "id": "prakriti", "question": "What is your dominant Prakriti constitution?", "options": ["Vata", "Pitta", "Kapha", "Tridoshic"] },
                    { "id": "agni", "question": "How is your digestive fire (Agni)?", "options": ["Sama", "Visham", "Tikshna", "Manda"] },
                    { "id": "koshtha", "question": "Describe your bowel habits (Koshtha).", "options": ["Krutschra", "Mridu", "Madhyama"] }
                ]
            }
        else:
            return {
                "adaptiveQuestions": [
                    { "id": "site", "question": "Where is the main location of your symptom/pain?", "options": ["Chest", "Abdomen", "Head", "Back/Joints"] },
                    { "id": "onset", "question": "How did the symptoms begin?", "options": ["Sudden", "Gradual", "Intermittent"] },
                    { "id": "severity", "question": "Rate the severity of your symptoms.", "options": ["Mild (1-3)", "Moderate (4-6)", "Severe (7-10)"] }
                ]
            }


def evaluate_red_flags(chief_complaint: str, socrates_answers: Dict[str, str] = None) -> List[str]:
    """
    Evaluates emergency red flags combining Groq LLM clinical reasoning with deterministic emergency safety guards.
    """
    red_flags = []
    text = (chief_complaint + " " + json.dumps(socrates_answers or {})).lower()

    # Deterministic Guardrails (Always run first for safety)
    if any(k in text for k in ["chest pain", "left arm", "crushing", "shortness of breath", "breathless"]):
        red_flags.append("CRITICAL: Potential Acute Coronary Syndrome / Cardiac Distress")
    if any(k in text for k in ["unconscious", "fainted", "seizure", "paralysis", "slurred speech"]):
        red_flags.append("CRITICAL: Neurological / Stroke Red Flag")
    if any(k in text for k in ["severe bleeding", "coughing blood", "vomiting blood"]):
        red_flags.append("HIGH PRIORITY: Hemorrhage Warning")

    # Groq GenAI Assessment
    system_prompt = (
        "You are an Emergency Triage AI Safety Assessor.\n"
        "Analyze the patient intake details and extract any urgent medical red flags.\n"
        "Return ONLY a JSON array of string warning messages, e.g. [\"WARNING: High risk of pulmonary embolism\"].\n"
        "If no critical red flags are found, return []."
    )
    user_prompt = f"Intake text: {text}"

    try:
        raw_response = call_llm(system_prompt, user_prompt, temperature=0.0)
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_response:
            raw_response = raw_response.split("```")[1].split("```")[0].strip()

        llm_flags = json.loads(raw_response)
        if isinstance(llm_flags, list):
            for flag in llm_flags:
                if flag not in red_flags:
                    red_flags.append(flag)
    except Exception as e:
        logger.info(f"LLM red-flag assessment skipped/failed ({e}). Using safety guardrails.")

    return red_flags


def generate_bilingual_soap(history_data: Dict[str, Any], language: str = "hi") -> Dict[str, Any]:
    """
    Synthesizes a structured clinical SOAP summary for doctors and bilingual text for patient audio playback using Groq LLM.
    """
    system_prompt = (
        "You are an AI Clinical Scribe.\n"
        "Convert the patient's intake history into a structured SOAP summary for the physician (in English) "
        "and a polite confirmation message for the patient (in their local language).\n"
        "Respond ONLY in valid JSON matching this schema:\n"
        "{\n"
        '  "structuredSOAP": {\n'
        '    "chiefComplaint": "...",\n'
        '    "historyOfPresentIllness": "...",\n'
        '    "pastMedicalHistory": "...",\n'
        '    "allergies": "...",\n'
        '    "reviewOfSystems": "..."\n'
        '  },\n'
        '  "bilingualAudioConfirmation": {\n'
        '    "patientAudioText": "...",\n'
        '    "doctorEnglishSummary": "..."\n'
        '  }\n'
        "}"
    )

    user_prompt = f"Patient Intake Data: {json.dumps(history_data)}\nPatient Preferred Language: {language}"

    try:
        raw_response = call_llm(system_prompt, user_prompt, temperature=0.1)
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_response:
            raw_response = raw_response.split("```")[1].split("```")[0].strip()

        return json.loads(raw_response)
    except Exception as e:
        logger.warning(f"Groq LLM SOAP generation failed ({e}). Returning structured template.")
        cc = history_data.get("chiefComplaint", "Not specified")
        return {
            "structuredSOAP": {
                "chiefComplaint": cc,
                "historyOfPresentIllness": f"Patient reports {cc}. Socrates details: {json.dumps(history_data.get('socrates', {}))}",
                "pastMedicalHistory": "None reported",
                "allergies": "No known drug allergies",
                "reviewOfSystems": "Systemic review pending physician examination"
            },
            "bilingualAudioConfirmation": {
                "patientAudioText": "आपका विवरण दर्ज कर लिया गया है। डॉक्टर आपके सारांश की समीक्षा कर रहे हैं।" if language == "hi" else "Your history is recorded and sent to the doctor.",
                "doctorEnglishSummary": f"Patient presented with {cc}."
            }
        }
