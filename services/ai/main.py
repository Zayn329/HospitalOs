from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from agents.reception import router as reception_router
from agents.consultation import router as consultation_router
from agents.diagnostics import router as diagnostics_router
from agents.medication_safety import router as medication_safety_router
from agents.billing import router as billing_router
from agents.patient_care import router as patient_care_router
<<<<<<< HEAD
=======
from agents.medikiosk import router as medikiosk_router
>>>>>>> b06b2f3 (feat(medikiosk): implement Groq LLM clinical intake engine)

app = FastAPI(title="HospitalOS AI Service", version="1.0.0")

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reception_router, prefix="/api/v1")
app.include_router(consultation_router, prefix="/api/v1/agent")
app.include_router(diagnostics_router, prefix="/api/v1/agent")
app.include_router(medication_safety_router, prefix="/api/v1/agent")
app.include_router(billing_router, prefix="/api/v1/agent")
app.include_router(patient_care_router, prefix="/api/v1/agent")
<<<<<<< HEAD
=======
app.include_router(medikiosk_router, prefix="/api/v1/agent")
>>>>>>> b06b2f3 (feat(medikiosk): implement Groq LLM clinical intake engine)

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "UP",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "service": "fastapi-ai-service"
    }

@app.post("/api/v1/agent/run")
async def run_agent(payload: dict):
    return {
        "success": True,
        "message": "AI service received payload",
        "received_payload": payload
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
