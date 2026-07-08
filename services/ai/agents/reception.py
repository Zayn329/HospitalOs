import os
import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from agents.llm import call_llm

router = APIRouter(prefix="/agent/reception", tags=["reception"])

# ----------------- Appointment Slot Suggestions Models & Router -----------------

class AppointmentInfo(BaseModel):
    appointmentTime: str
    status: str

class SlotSuggestionRequest(BaseModel):
    doctorId: str
    doctorName: str
    specialization: str = None
    department: str = None
    date: str
    availability: List[str]
    existingAppointments: List[AppointmentInfo]
    urgency: str = "low" # low, medium, high
    reason: str = None
    appointmentType: str = "consultation"

class SlotSuggestionResponse(BaseModel):
    availableSlots: List[str]
    bookedSlots: List[str]
    recommendation: str

@router.post("/suggest", response_model=SlotSuggestionResponse)
def suggest_slots(payload: SlotSuggestionRequest):
    # 1. Retrieve active booked slots
    booked = [
        appt.appointmentTime 
        for appt in payload.existingAppointments 
        if appt.status != "cancelled"
    ]
    
    # 2. Calculate remaining available slots
    available = [
        slot for slot in payload.availability 
        if slot not in booked
    ]
    
    # 3. Check for API keys to query Gemini
    try:
        system_prompt = (
            "You are the AI Reception Agent for HospitalOS, a modern hospital system. "
            "Your task is to analyze doctor availability and workload, consider the patient's urgency and reason, "
            "highlight potential booking conflicts, and provide scheduling advice.\n\n"
            f"Doctor Name: Dr. {payload.doctorName}\n"
            f"Doctor Speciality: {payload.specialization or 'General Medicine'} ({payload.department or 'Outpatient Clinic'})\n"
            f"Workload: {len(booked)} existing appointments booked today.\n"
            f"Patient Urgency: {payload.urgency}\n"
            f"Reason for Visit: {payload.reason or 'Routine Check'}\n"
            f"Appointment Type: {payload.appointmentType}\n"
            f"Date: {payload.date}\n"
            f"Standard Availability Slots: {', '.join(payload.availability)}\n"
            f"Already Booked Slots (Unavailable): {', '.join(booked) if booked else 'None'}\n"
            f"Free Available Slots: {', '.join(available) if available else 'None'}\n\n"
            "Recommend the most suitable slot for the patient. "
            "If urgency is HIGH, try to recommend the earliest slot. If the workload is heavy, recommend a less busy period. "
            "Respond with a conversational, polite suggestion message (2-3 sentences max) recommending the best slot. "
            "Explain briefly why you recommend it."
        )
        recommendation = call_llm(system_prompt, temperature=0.1)
        
        return SlotSuggestionResponse(
            availableSlots=available,
            bookedSlots=booked,
            recommendation=recommendation
        )
    except Exception as e:
        print(f"Gemini LLM agent call failed: {e}")
        pass
            
    # 4. Local rule-based recommendation fallback
    workload_count = len(booked)
    if not available:
        recommendation = (
            f"Hello! I am the Reception Agent. Unfortunately, Dr. {payload.doctorName} "
            f"has no available slots remaining on {payload.date}. "
            f"Please select another date."
        )
    else:
        slots_str = ", ".join(available)
        if payload.urgency == "high":
            recommended_slot = available[0]
            recommendation = (
                f"Hello! I am the Reception Agent. Because the patient's urgency is high, "
                f"I recommend booking the earliest slot ({recommended_slot}) with Dr. {payload.doctorName} "
                f"({payload.specialization or 'Specialist'}) on {payload.date} to ensure prompt care."
            )
        elif workload_count >= 3:
            recommended_slot = available[-1]
            recommendation = (
                f"Hello! I am the Reception Agent. Dr. {payload.doctorName} has a heavy schedule today "
                f"({workload_count} bookings). To minimize wait times, I recommend booking a later slot "
                f"like {recommended_slot} on {payload.date}."
            )
        else:
            recommended_slot = available[0]
            recommendation = (
                f"Hello! I am the Reception Agent. Dr. {payload.doctorName} has {len(available)} "
                f"slots open on {payload.date}. I recommend the {recommended_slot} slot for a routine "
                f"{payload.appointmentType}."
            )

    return SlotSuggestionResponse(
        availableSlots=available,
        bookedSlots=booked,
        recommendation=recommendation
    )


# ----------------- Semantic Duplicate Patient Check Models & Router -----------------

class PatientCheckPayload(BaseModel):
    hospitalId: str = None
    firstName: str
    lastName: str
    phone: str
    dateOfBirth: str
    gender: str
    address: str = None

class DuplicateCheckRequest(BaseModel):
    newPatient: PatientCheckPayload
    existingPatients: List[PatientCheckPayload]

class DuplicateMatch(BaseModel):
    hospitalId: str = None
    firstName: str
    lastName: str
    phone: str
    dateOfBirth: str
    confidence: float
    reasons: List[str]

class DuplicateCheckResponse(BaseModel):
    isPotentialDuplicate: bool
    matches: List[DuplicateMatch]

def fallback_duplicate_check(new_patient: PatientCheckPayload, existing_patients: List[PatientCheckPayload]) -> List[DuplicateMatch]:
    matches = []
    new_first = new_patient.firstName.lower().strip()
    new_last = new_patient.lastName.lower().strip()
    new_phone_digits = "".join(filter(str.isdigit, new_patient.phone))
    new_dob = new_patient.dateOfBirth.split('T')[0] if 'T' in new_patient.dateOfBirth else new_patient.dateOfBirth
    
    for pat in existing_patients:
        pat_first = pat.firstName.lower().strip()
        pat_last = pat.lastName.lower().strip()
        pat_phone_digits = "".join(filter(str.isdigit, pat.phone))
        pat_dob = pat.dateOfBirth.split('T')[0] if 'T' in pat.dateOfBirth else pat.dateOfBirth
        
        confidence = 0.0
        reasons = []
        
        # Check name matching
        name_exact = (new_first == pat_first) and (new_last == pat_last)
        name_swapped = (new_first == pat_last) and (new_last == pat_first)
        first_match = (new_first == pat_first) or (new_first in pat_first) or (pat_first in new_first)
        last_match = (new_last == pat_last) or (new_last in pat_last) or (pat_last in new_last)
        
        # Phone matching
        phone_match = False
        if new_phone_digits and pat_phone_digits:
            phone_match = (new_phone_digits == pat_phone_digits) or (new_phone_digits[-7:] == pat_phone_digits[-7:])
            
        # DOB matching
        dob_match = (new_dob == pat_dob)
        
        if name_exact and phone_match and dob_match:
            confidence = 1.0
            reasons.append("Exact match on name, phone, and date of birth.")
        elif name_exact and dob_match:
            confidence = 0.95
            reasons.append("Exact name and date of birth match, with different phone format.")
        elif name_exact and phone_match:
            confidence = 0.9
            reasons.append("Exact name and phone match.")
        elif (first_match or last_match) and dob_match and phone_match:
            confidence = 0.85
            reasons.append("Phone and date of birth match, with minor name variation.")
        elif name_exact:
            confidence = 0.8
            reasons.append("Exact name match, but different phone and date of birth.")
        elif (new_first in pat_first or pat_first in new_first) and (new_last in pat_last or pat_last in new_last) and dob_match:
            confidence = 0.8
            reasons.append("Fuzzy name match and exact date of birth match.")
        elif phone_match:
            confidence = 0.75
            reasons.append("Phone number match, but name and date of birth differ.")
        elif name_swapped and dob_match:
            confidence = 0.75
            reasons.append("First and last names are swapped, with matching date of birth.")
        elif (new_first == pat_first or new_last == pat_last) and dob_match:
            confidence = 0.7
            reasons.append("Matching first or last name and matching date of birth.")
            
        if confidence >= 0.7:
            matches.append(DuplicateMatch(
                hospitalId=pat.hospitalId,
                firstName=pat.firstName,
                lastName=pat.lastName,
                phone=pat.phone,
                dateOfBirth=pat.dateOfBirth,
                confidence=confidence,
                reasons=reasons
            ))
            
    return matches

@router.post("/patient/duplicate-check", response_model=DuplicateCheckResponse)
def check_duplicate_patients(payload: DuplicateCheckRequest):
    if payload.existingPatients:
        try:
            candidates_formatted = []
            for pat in payload.existingPatients:
                candidates_formatted.append(
                    f"- ID: {pat.hospitalId}, Name: {pat.firstName} {pat.lastName}, Phone: {pat.phone}, DOB: {pat.dateOfBirth}"
                )
            
            system_prompt = (
                "You are the AI Reception Agent for HospitalOS. Your task is to perform semantic deduplication "
                "of patient records. Compare the new patient record against a list of candidate existing patients. "
                "Look for similarities despite differences in formatting, abbreviations, middle names, typos, casing, "
                "or date-of-birth formats. "
                "For each candidate, output a confidence score from 0.0 to 1.0 (where 1.0 is exact match, and >=0.7 is a potential duplicate) "
                "and a list of reasons for your matching decision. "
                "If no candidates are similar, return empty list. "
                "Respond STRICTLY in JSON format with a key 'matches' containing an array of objects. "
                "Each object MUST have: 'hospitalId', 'firstName', 'lastName', 'phone', 'dateOfBirth', 'confidence', 'reasons'. "
                "Do NOT output markdown blocks (like ```json). Respond with pure JSON."
            )
            user_prompt = (
                "New Patient:\n"
                f"Name: {payload.newPatient.firstName} {payload.newPatient.lastName}\n"
                f"Phone: {payload.newPatient.phone}\n"
                f"DOB: {payload.newPatient.dateOfBirth}\n"
                f"Gender: {payload.newPatient.gender}\n"
                f"Address: {payload.newPatient.address or 'None'}\n\n"
                "Candidate Patients:\n"
                f"{'\n'.join(candidates_formatted)}\n\n"
                "Provide your analysis."
            )
            content = call_llm(system_prompt, user_prompt, temperature=0.1)
            # Basic cleaning if JSON fences are present
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            
            data = json.loads(content)
            matches = []
            for m in data.get("matches", []):
                if float(m.get("confidence", 0)) >= 0.7:
                    matches.append(DuplicateMatch(
                        hospitalId=m.get("hospitalId"),
                        firstName=m.get("firstName"),
                        lastName=m.get("lastName"),
                        phone=m.get("phone"),
                        dateOfBirth=m.get("dateOfBirth"),
                        confidence=float(m.get("confidence")),
                        reasons=m.get("reasons", [])
                    ))
            
            return DuplicateCheckResponse(
                isPotentialDuplicate=len(matches) > 0,
                matches=matches
            )
            
        except Exception as e:
            print(f"Gemini duplicate check call failed: {e}")
            pass
            
    # Fallback to local rule-based check
    matches = fallback_duplicate_check(payload.newPatient, payload.existingPatients)
    return DuplicateCheckResponse(
        isPotentialDuplicate=len(matches) > 0,
        matches=matches
    )

class LateCheckinRequest(BaseModel):
    appointmentTime: str
    arrivalTime: str
    doctorName: str
    doctorWorkload: int

class LateCheckinResponse(BaseModel):
    recommendedAction: str
    explanation: str

def fallback_late_checkin(payload: LateCheckinRequest) -> LateCheckinResponse:
    try:
        appt_hour, appt_min = map(int, payload.appointmentTime.split(':'))
        arr_hour, arr_min = map(int, payload.arrivalTime.split(':'))
        delay = (arr_hour - appt_hour) * 60 + (arr_min - appt_min)
    except Exception:
        delay = 20
        
    if delay <= 15 and payload.doctorWorkload < 4:
        action = "proceed"
        explanation = f"Patient is only {delay} minutes late, and Dr. {payload.doctorName} has a light workload. We can proceed with standard check-in."
    elif delay <= 30 and payload.doctorWorkload < 6:
        action = "queue_as_walkin"
        explanation = f"Patient is {delay} minutes late. Dr. {payload.doctorName} is on schedule but busy; adding patient to the wait queue as a walk-in is recommended."
    else:
        action = "reschedule"
        explanation = f"Patient arrived {delay} minutes late. Because of the excessive delay or heavy workload ({payload.doctorWorkload} bookings), please reschedule this appointment."
        
    return LateCheckinResponse(recommendedAction=action, explanation=explanation)

@router.post("/checkin/late-options", response_model=LateCheckinResponse)
def evaluate_late_checkin(payload: LateCheckinRequest):
    try:
        system_prompt = (
            "You are the AI Reception Agent for HospitalOS. Your task is to analyze late arrivals of patients "
            "and recommend the best option to the receptionist. "
            f"Doctor Name: Dr. {payload.doctorName}\n"
            f"Appointment Time: {payload.appointmentTime}\n"
            f"Actual Arrival Time (Late): {payload.arrivalTime}\n"
            f"Doctor Workload: {payload.doctorWorkload} bookings scheduled today.\n\n"
            "Evaluate the situation. Provide a recommendation which action to take. "
            "Options: \n"
            "- 'proceed': check in anyway if the doctor has few bookings and the delay is minor (under 15 mins).\n"
            "- 'queue_as_walkin': place patient in the waiting queue if they are moderately late (15-30 mins) but doctor has some opening.\n"
            "- 'reschedule': require reschedule if they are extremely late (>30 mins) or the doctor has a heavy workload (>4 bookings).\n\n"
            "Respond with a JSON block having keys: 'recommendedAction' (one of: 'proceed', 'queue_as_walkin', 'reschedule') "
            "and 'explanation' (2 sentences explaining the decision). "
            "Do NOT output markdown blocks (like ```json). Respond with pure JSON."
        )
        content = call_llm(system_prompt, temperature=0.1)
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
            
        data = json.loads(content)
        return LateCheckinResponse(
            recommendedAction=data.get("recommendedAction", "proceed"),
            explanation=data.get("explanation", "")
        )
    except Exception as e:
        print(f"Gemini late checkin advisor failed: {e}")
        pass
            
    return fallback_late_checkin(payload)

class TriageRequest(BaseModel):
    symptoms: str

class TriageResponse(BaseModel):
    priority: str
    explanation: str
    suggestedQuestions: list[str]
    insufficientInfo: bool

def fallback_triage(payload: TriageRequest) -> TriageResponse:
    symptoms_lower = payload.symptoms.lower()
    
    if len(payload.symptoms.strip()) < 12 or symptoms_lower in ["feels sick", "feeling bad", "sick", "not well"]:
        return TriageResponse(
            priority="routine",
            explanation="The provided symptom description is too brief or non-specific to make an accurate priority assessment.",
            suggestedQuestions=[
                "What specific symptoms are you experiencing?",
                "How long have you been experiencing this?",
                "Do you have a fever, chest pain, or shortness of breath?"
            ],
            insufficientInfo=True
        )
        
    emergency_keywords = ["chest pain", "shortness of breath", "breathing", "unconscious", "stroke", "bleeding", "crushing", "heart", "severe pain"]
    urgent_keywords = ["fever", "vomiting", "abdominal pain", "fracture", "dizzy", "infection", "headache", "asthma"]
    
    is_emergency = any(k in symptoms_lower for k in emergency_keywords)
    is_urgent = any(k in symptoms_lower for k in urgent_keywords)
    
    if is_emergency:
        priority = "emergency"
        explanation = "Symptoms indicate high risk of cardiorespiratory distress or acute critical conditions requiring immediate attention."
        questions = ["When did the symptoms start?", "Do you feel dizzy or lightheaded?", "Is there radiating pain to the arm or jaw?"]
    elif is_urgent:
        priority = "urgent"
        explanation = "Symptoms are concerning and require prompt evaluation, but do not appear immediately life-threatening."
        questions = ["What is your body temperature?", "Are you able to keep fluids down?", "How severe is the pain on a 1-10 scale?"]
    else:
        priority = "routine"
        explanation = "Symptoms are mild and suitable for standard outpatient care schedule."
        questions = ["How long has this been occurring?", "Have you taken any over-the-counter medication?"]
        
    return TriageResponse(
        priority=priority,
        explanation=explanation,
        suggestedQuestions=questions,
        insufficientInfo=False
    )

@router.post("/triage/evaluate", response_model=TriageResponse)
def evaluate_triage(payload: TriageRequest):
    try:
        system_prompt = (
            "You are the AI Triage Agent for HospitalOS. Your task is to analyze patient symptom descriptions, "
            "categorize their urgency level, and provide follow-up recommendations.\n"
            "Urgency Categories:\n"
            "- 'emergency': severe symptoms (chest pain, breathing issues, severe bleeding, unconsciousness, etc.).\n"
            "- 'urgent': moderate symptoms (high fever, severe abdominal pain, possible fractures, severe headache).\n"
            "- 'routine': minor symptoms (mild throat scratch, standard cough, mild rash, simple follow-up).\n\n"
            "If the symptom description is too short (e.g. less than 12 characters) or extremely vague (e.g. 'feels sick', 'bad'), "
            "flag 'insufficientInfo' as true, priority as 'routine', and list 3 specific questions to ask the patient "
            "to gather critical details.\n\n"
            "Respond with a JSON block having keys:\n"
            "- 'priority': one of 'emergency', 'urgent', 'routine'\n"
            "- 'explanation': 2-sentence medical reasoning for the priority\n"
            "- 'suggestedQuestions': array of 3 specific questions to ask the patient\n"
            "- 'insufficientInfo': boolean (true if symptoms are vague/incomplete)\n\n"
            "Do NOT output markdown blocks (like ```json). Respond with pure JSON."
        )
        user_prompt = f"Symptoms: {payload.symptoms}\n\nProvide triage evaluation:"
        content = call_llm(system_prompt, user_prompt, temperature=0.1)
        if content.startswith("```"):
            content = content.replace("```json", "").replace("```", "").strip()
            
        data = json.loads(content)
        return TriageResponse(
            priority=data.get("priority", "routine"),
            explanation=data.get("explanation", ""),
            suggestedQuestions=data.get("suggestedQuestions", []),
            insufficientInfo=data.get("insufficientInfo", False)
        )
    except Exception as e:
        print(f"Gemini triage evaluation failed: {e}")
        pass
            
    return fallback_triage(payload)
