"""
Bisheshoggo AI - AI Chat and Medicine Suggestion Routes
Powered by Groq's GPT-OSS-120B, with a Gemma model as fallback.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..ai_service import ai_chat, ai_medicine_analysis

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/chat")
async def chat(
    request: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user),
):
    """AI Chat endpoint - streamed as SSE for the frontend's chat UI."""
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        result = await ai_chat(messages)

        async def generate():
            content = result["content"]
            # Send in chunks to simulate streaming
            chunk_size = 50
            for i in range(0, len(content), chunk_size):
                chunk = content[i:i + chunk_size]
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )
    except Exception as e:
        print(f"[Bisheshoggo AI] Chat Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat request"
        )


@router.post("/chat/simple")
async def chat_simple(
    request: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user)
):
    """Non-streaming AI Chat endpoint."""
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        result = await ai_chat(messages)

        return {
            "content": result["content"],
            "role": "assistant",
            "model": result["model"],
        }
    except Exception as e:
        print(f"[Bisheshoggo AI] Chat Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat request"
        )


@router.post("/medicine-suggestions", response_model=schemas.MedicineSuggestionResponse)
async def get_medicine_suggestions(
    request: schemas.MedicineSuggestionRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-powered medicine suggestions."""
    try:
        consultations = db.query(models.Consultation).filter(
            models.Consultation.patient_id == current_user.id,
            models.Consultation.status == models.ConsultationStatus.completed
        ).order_by(models.Consultation.created_at.desc()).limit(5).all()

        consultation_history = "\n\n".join([
            f"Diagnosis: {c.diagnosis or 'N/A'}\nSymptoms: {c.symptoms or 'N/A'}\nPrescription: {c.prescription or 'N/A'}"
            for c in consultations
        ])

        result = await ai_medicine_analysis(
            prescriptions=request.prescriptions,
            diagnosis=request.diagnosis or "",
            patient_history=request.patientHistory or "",
            consultation_history=consultation_history,
        )
        return result
    except Exception as e:
        print(f"[Bisheshoggo AI] Medicine Suggestion Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate suggestions"
        )
