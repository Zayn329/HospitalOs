from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

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
    # Retrieve only active, non-cancelled bookings
    booked = [
        appt.appointmentTime 
        for appt in payload.existingAppointments 
        if appt.status != "cancelled"
    ]
    
    # Calculate available free slots
    available = [
        slot for slot in payload.availability 
        if slot not in booked
    ]
    
    # Generate conversational guidance recommendation
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
