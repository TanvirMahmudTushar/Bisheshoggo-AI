"""
Bisheshoggo AI - Medical Facilities Routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user_optional

router = APIRouter(prefix="/facilities", tags=["Facilities"])


@router.get("", response_model=dict)
async def get_facilities(
    type: Optional[str] = Query(None, description="Filter by facility type"),
    district: Optional[str] = Query(None, description="Filter by district"),
    db: Session = Depends(get_db)
):
    """Get all active medical facilities"""
    query = db.query(models.MedicalFacility).filter(
        models.MedicalFacility.is_active == True
    )
    
    if type and type != "all":
        query = query.filter(models.MedicalFacility.facility_type == type)
    
    if district and district != "all":
        query = query.filter(models.MedicalFacility.district == district)
    
    facilities = query.order_by(models.MedicalFacility.name).all()
    
    # Convert to dict for serialization
    facilities_data = []
    for facility in facilities:
        facilities_data.append({
            "id": facility.id,
            "name": facility.name,
            "facility_type": facility.facility_type,
            "phone": facility.phone,
            "address": facility.address,
            "village": facility.village,
            "district": facility.district,
            "division": facility.division,
            "latitude": facility.latitude,
            "longitude": facility.longitude,
            "operating_hours": facility.operating_hours,
            "services_offered": facility.services_offered,
            "has_ambulance": facility.has_ambulance,
            "has_emergency": facility.has_emergency,
            "is_active": facility.is_active,
            "contact_person": facility.contact_person,
            "created_at": facility.created_at.isoformat() if facility.created_at else None
        })
    
    return {"data": facilities_data}


@router.post("", response_model=dict)
async def create_facility(
    facility_data: schemas.FacilityCreate,
    current_user: models.User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Create a new medical facility"""
    db_facility = models.MedicalFacility(
        **facility_data.model_dump(),
        created_by=current_user.id if current_user else None
    )
    
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)

    return {"success": True, "data": schemas.FacilityResponse.model_validate(db_facility).model_dump(mode="json")}


@router.get("/{facility_id}", response_model=schemas.FacilityResponse)
async def get_facility(
    facility_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific facility"""
    facility = db.query(models.MedicalFacility).filter(
        models.MedicalFacility.id == facility_id
    ).first()
    
    if not facility:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facility not found"
        )
    
    return facility

