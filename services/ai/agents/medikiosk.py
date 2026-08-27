from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from .medikiosk_agent import generate_hybrid_questions, evaluate_red_flags, generate_bilingual_soap, extract_ocr_document

router = APIRouter()

class OcrRequest(BaseModel):
    filePath: Optional[str] = None
    rawText: Optional[str] = None
    docType: Optional[str] = "Prescription"

class IntakeQuestionRequest(BaseModel):
    chiefComplaint: str
    mode: Optional[str] = "allopathy"
    language: Optional[str] = "en"

class RedFlagsRequest(BaseModel):
    chiefComplaint: str
    socrates: Optional[Dict[str, str]] = {}

class SummaryRequest(BaseModel):
    historyData: Dict[str, Any]
    language: Optional[str] = "hi"

@router.post("/medikiosk/questions")
async def get_medikiosk_questions(payload: IntakeQuestionRequest):
    try:
        result = generate_hybrid_questions(
            chief_complaint=payload.chiefComplaint,
            mode=payload.mode or "allopathy",
            language=payload.language or "en"
        )
        red_flags = evaluate_red_flags(payload.chiefComplaint)
        return {
            "success": True,
            "data": {
                "adaptiveQuestions": result.get("adaptiveQuestions", []),
                "redFlagsDetected": red_flags
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/medikiosk/ocr")
async def process_medikiosk_ocr(payload: OcrRequest):
    try:
        ocr_result = extract_ocr_document(
            file_path=payload.filePath,
            raw_text=payload.rawText,
            doc_type=payload.docType or "Prescription"
        )
        return {
            "success": True,
            "data": ocr_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/medikiosk/summary")
async def get_medikiosk_summary(payload: SummaryRequest):
    try:
        summary = generate_bilingual_soap(
            history_data=payload.historyData,
            language=payload.language or "hi"
        )
        return {
            "success": True,
            "data": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
