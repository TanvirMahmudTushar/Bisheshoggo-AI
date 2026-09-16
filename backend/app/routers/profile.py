"""
Bisheshoggo AI - Profile Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=schemas.FullProfileResponse)
async def get_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile with additional data"""
    additional_data = None
    
    if current_user.role == schemas.UserRole.patient:
        additional_data = db.query(models.PatientProfile).filter(
            models.PatientProfile.user_id == current_user.id
        ).first()
    elif current_user.role in [schemas.UserRole.doctor, schemas.UserRole.community_health_worker]:
        additional_data = db.query(models.ProviderProfile).filter(
            models.ProviderProfile.user_id == current_user.id
        ).first()
    
    return {
        "profile": current_user,
        "additionalData": additional_data
    }


PATIENT_FIELDS = (
    "date_of_birth", "blood_group", "gender", "address", "village", "district", "division",
    "emergency_contact_name", "emergency_contact_phone", "medical_conditions", "allergies",
    "current_medications",
)
PROVIDER_FIELDS = (
    "specialization", "license_number", "qualification", "years_of_experience",
    "consultation_fee", "available_for_telemedicine", "is_available", "languages", "bio",
)


@router.put("")
async def update_profile(
    profile_data: schemas.ProfileUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile.

    Accepts a single flat body with user fields and role-specific fields
    together (matching what the frontend's edit form actually sends), and
    routes each field to the right table.
    """
    data = profile_data.model_dump(exclude_unset=True)

    # Update user fields
    for field in ("full_name", "phone", "avatar_url"):
        if field in data and data[field] is not None:
            setattr(current_user, field, data[field])

    # Update patient-specific data
    if current_user.role == schemas.UserRole.patient:
        patient_profile = db.query(models.PatientProfile).filter(
            models.PatientProfile.user_id == current_user.id
        ).first()

        if not patient_profile:
            patient_profile = models.PatientProfile(user_id=current_user.id)
            db.add(patient_profile)

        for field in PATIENT_FIELDS:
            if field in data:
                setattr(patient_profile, field, data[field])

    # Update provider-specific data
    elif current_user.role in [schemas.UserRole.doctor, schemas.UserRole.community_health_worker]:
        provider_profile = db.query(models.ProviderProfile).filter(
            models.ProviderProfile.user_id == current_user.id
        ).first()

        if not provider_profile:
            provider_profile = models.ProviderProfile(user_id=current_user.id)
            db.add(provider_profile)

        for field in PROVIDER_FIELDS:
            if field in data:
                setattr(provider_profile, field, data[field])

    db.commit()

    return {"success": True}


