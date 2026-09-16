"""
Bisheshoggo AI - Consultations Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/consultations", tags=["Consultations"])


@router.post("", response_model=dict)
async def create_consultation(
    consultation_data: schemas.ConsultationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new consultation"""
    db_consultation = models.Consultation(
        patient_id=current_user.id,
        provider_id=consultation_data.provider_id,
        consultation_type=consultation_data.consultation_type,
        scheduled_at=consultation_data.scheduled_at,
        symptoms=consultation_data.symptoms,
        notes=consultation_data.notes,
        status=models.ConsultationStatus.pending
    )
    
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)
    
    # Load relationships
    db_consultation = db.query(models.Consultation).options(
        joinedload(models.Consultation.patient),
        joinedload(models.Consultation.provider)
    ).filter(models.Consultation.id == db_consultation.id).first()

    return {"success": True, "data": schemas.ConsultationResponse.model_validate(db_consultation).model_dump(mode="json")}


@router.get("", response_model=dict)
async def get_consultations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all consultations for current user"""
    consultations = db.query(models.Consultation).options(
        joinedload(models.Consultation.patient),
        joinedload(models.Consultation.provider)
    ).filter(
        or_(
            models.Consultation.patient_id == current_user.id,
            models.Consultation.provider_id == current_user.id
        )
    ).order_by(models.Consultation.created_at.desc()).all()

    return {"data": [schemas.ConsultationResponse.model_validate(c).model_dump(mode="json") for c in consultations]}


@router.get("/{consultation_id}", response_model=schemas.ConsultationResponse)
async def get_consultation(
    consultation_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific consultation"""
    consultation = db.query(models.Consultation).options(
        joinedload(models.Consultation.patient),
        joinedload(models.Consultation.provider)
    ).filter(models.Consultation.id == consultation_id).first()
    
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    # Check access
    if consultation.patient_id != current_user.id and consultation.provider_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this consultation"
        )
    
    return consultation


@router.put("/{consultation_id}")
async def update_consultation(
    consultation_id: str,
    new_status: schemas.ConsultationStatus = None,
    diagnosis: str = None,
    prescription: str = None,
    notes: str = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a consultation"""
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id
    ).first()
    
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    # Check access
    if consultation.patient_id != current_user.id and consultation.provider_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this consultation"
        )
    
    if new_status:
        consultation.status = new_status
    if diagnosis:
        consultation.diagnosis = diagnosis
    if prescription:
        consultation.prescription = prescription
    if notes:
        consultation.notes = notes
    
    db.commit()
    
    return {"success": True}


