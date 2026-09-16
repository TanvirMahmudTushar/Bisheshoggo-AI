"""
Bisheshoggo AI - Medical Records Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/medical-records", tags=["Medical Records"])


@router.post("", response_model=dict)
async def create_medical_record(
    record_data: schemas.MedicalRecordCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new medical record"""
    db_record = models.MedicalRecord(
        patient_id=current_user.id,
        provider_id=record_data.provider_id,
        consultation_id=record_data.consultation_id,
        record_type=record_data.record_type,
        title=record_data.title,
        description=record_data.description,
        diagnosis=record_data.diagnosis,
        prescriptions=record_data.prescriptions,
        attachments=record_data.attachments
    )
    
    db.add(db_record)
    db.commit()
    db.refresh(db_record)

    return {"success": True, "data": schemas.MedicalRecordResponse.model_validate(db_record).model_dump(mode="json")}


@router.get("", response_model=dict)
async def get_medical_records(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all medical records for current user"""
    records = db.query(models.MedicalRecord).options(
        joinedload(models.MedicalRecord.provider)
    ).filter(
        models.MedicalRecord.patient_id == current_user.id
    ).order_by(models.MedicalRecord.created_at.desc()).all()
    
    # Format response
    result = []
    for record in records:
        result.append({
            "id": record.id,
            "patient_id": record.patient_id,
            "provider_id": record.provider_id,
            "consultation_id": record.consultation_id,
            "record_type": record.record_type,
            "title": record.title,
            "description": record.description,
            "diagnosis": record.diagnosis,
            "prescriptions": record.prescriptions,
            "attachments": record.attachments,
            "document_url": record.document_url,
            "record_date": record.record_date,
            "created_at": record.created_at,
            "provider": {
                "full_name": record.provider.full_name if record.provider else None
            } if record.provider else None
        })
    
    return {"data": result}


@router.get("/{record_id}", response_model=schemas.MedicalRecordResponse)
async def get_medical_record(
    record_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific medical record"""
    record = db.query(models.MedicalRecord).options(
        joinedload(models.MedicalRecord.provider)
    ).filter(models.MedicalRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical record not found"
        )
    
    # Check access
    if record.patient_id != current_user.id and record.provider_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this record"
        )
    
    return record


