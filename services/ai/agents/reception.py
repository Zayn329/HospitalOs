import os
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

router = APIRouter(prefix="/agent/reception", tags=["reception"])

class AppointmentInfo(BaseModel):
    appointmentTime: str
    status: str

class SlotSuggestionRequest(BaseModel):
    doctorId: str
    doctorName: str
    date: str
    availability: List[str]
    existingAppointments: List[AppointmentInfo]

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
    
    # 3. Check for API keys to query Gemini 2.5 Flash
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    
    if api_key:
        try:
            # Connect using ChatGoogleGenerativeAI with model "gemini-2.5-flash"
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.1
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are the AI Reception Agent for HospitalOS, a modern hospital system. "
                    "Your task is to analyze doctor availability, highlight potential booking conflicts, "
                    "and provide booking advice to the receptionist. "
                    "Doctor Name: Dr. {doctor_name}\n"
                    "Date: {date}\n"
                    "Standard Availability Slots: {availability}\n"
                    "Already Booked Slots (Unavailable): {booked}\n"
                    "Free Available Slots: {free}\n\n"
                    "Respond with a conversational, polite suggestion message (2-3 sentences max) recommending the best slot. "
                    "Explain briefly why you recommend it (e.g. morning slots are less crowded, first available slot is preferred)."
                ))
            ])
            
            chain = prompt | llm
            response = chain.invoke({
                "doctor_name": payload.doctorName,
                "date": payload.date,
                "availability": ", ".join(payload.availability),
                "booked": ", ".join(booked) if booked else "None",
                "free": ", ".join(available) if available else "None"
            })
            
            recommendation = response.content.strip()
            
            return SlotSuggestionResponse(
                availableSlots=available,
                bookedSlots=booked,
                recommendation=recommendation
            )
        except Exception as e:
            # Fall back to template if LLM call fails
            print(f"Gemini LLM agent call failed: {e}")
            pass
            
    # 4. Local rule-based recommendation fallback
    if not available:
        recommendation = (
            f"Hello! I am the Reception Agent. Unfortunately, Dr. {payload.doctorName} "
            f"has no available slots remaining on {payload.date}. "
            f"Please select another date."
        )
    else:
        slots_str = ", ".join(available)
        recommendation = (
            f"Hello! I am the Reception Agent. Dr. {payload.doctorName} has "
            f"the following open slots on {payload.date}: {slots_str}. "
            f"I recommend booking early morning or the first slot after lunch ({available[-2] if len(available) > 2 else available[0]}) "
            f"to minimize patient wait times."
        )

    return SlotSuggestionResponse(
        availableSlots=available,
        bookedSlots=booked,
        recommendation=recommendation
    )
