from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import datetime

from agents.reception import router as reception_router

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
