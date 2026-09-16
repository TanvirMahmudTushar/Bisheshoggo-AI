"""
Bisheshoggo AI - Emergency SOS Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/emergency", tags=["Emergency"])


@router.post("", response_model=dict)
async def create_emergency(
    emergency_data: schemas.EmergencyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new emergency SOS alert"""
    db_emergency = models.EmergencySOS(
        patient_id=current_user.id,
        location_latitude=emergency_data.latitude,
        location_longitude=emergency_data.longitude,
        location_address=emergency_data.location,
        emergency_type=emergency_data.emergency_type,
        description=emergency_data.description,
        status=models.EmergencyStatus.active
    )
    
    db.add(db_emergency)
    db.commit()
    db.refresh(db_emergency)

    return {"success": True, "data": schemas.EmergencyResponse.model_validate(db_emergency).model_dump(mode="json")}


@router.get("", response_model=dict)
async def get_emergencies(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get emergency alerts (all for healthcare workers, own for patients)"""
    query = db.query(models.EmergencySOS).options(
        joinedload(models.EmergencySOS.patient)
    )
    
    # Healthcare workers can see all emergencies
    if current_user.role not in [schemas.UserRole.doctor, schemas.UserRole.community_health_worker]:
        query = query.filter(models.EmergencySOS.patient_id == current_user.id)
    
    emergencies = query.order_by(
        models.EmergencySOS.created_at.desc()
    ).limit(50).all()

    return {"data": [schemas.EmergencyResponse.model_validate(e).model_dump(mode="json") for e in emergencies]}


@router.put("/{emergency_id}")
async def update_emergency(
    emergency_id: str,
    new_status: schemas.EmergencyStatus,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update emergency status (healthcare workers only)"""
    if current_user.role not in [schemas.UserRole.doctor, schemas.UserRole.community_health_worker]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only healthcare workers can update emergency status"
        )
    
    emergency = db.query(models.EmergencySOS).filter(
        models.EmergencySOS.id == emergency_id
    ).first()
    
    if not emergency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency not found"
        )
    
    from datetime import datetime, timezone
    
    emergency.status = new_status
    if new_status == schemas.EmergencyStatus.responded:
        emergency.responder_id = current_user.id
        emergency.responded_at = datetime.now(timezone.utc)
    elif new_status == schemas.EmergencyStatus.resolved:
        emergency.resolved_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"success": True}


