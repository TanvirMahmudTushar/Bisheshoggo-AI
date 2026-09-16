"""
Bisheshoggo AI - Healthcare Providers Routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/providers", tags=["Providers"])


@router.get("", response_model=dict)
async def get_providers(
    specialization: Optional[str] = Query(None, description="Filter by specialization"),
    db: Session = Depends(get_db)
):
    """Get all available healthcare providers"""
    query = db.query(models.ProviderProfile).options(
        joinedload(models.ProviderProfile.user)
    ).filter(models.ProviderProfile.is_available == True)
    
    if specialization and specialization != "all":
        query = query.filter(models.ProviderProfile.specialization == specialization)
    
    providers = query.all()
    
    # Format response to include user profile
    result = []
    for provider in providers:
        result.append({
            "id": provider.id,
            "user_id": provider.user_id,
            "specialization": provider.specialization,
            "license_number": provider.license_number,
            "qualification": provider.qualification,
            "years_of_experience": provider.years_of_experience,
            "consultation_fee": provider.consultation_fee,
            "available_for_telemedicine": provider.available_for_telemedicine,
            "is_available": provider.is_available,
            "languages": provider.languages,
            "bio": provider.bio,
            "district": provider.district,
            "location": provider.location,
            "latitude": provider.latitude,
            "longitude": provider.longitude,
            "profile": {
                "full_name": provider.user.full_name,
                "email": provider.user.email,
                "phone_number": provider.user.phone,
                "avatar_url": provider.user.avatar_url
            }
        })
    
    return {"data": result}


