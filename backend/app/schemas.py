"""
Bisheshoggo AI - Pydantic Schemas for Request/Response Validation
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


# Enums
class UserRole(str, Enum):
    patient = "patient"
    doctor = "doctor"
    community_health_worker = "community_health_worker"
    pharmacy = "pharmacy"
    clinic = "clinic"


class ConsultationStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class EmergencyStatus(str, Enum):
    active = "active"
    responded = "responded"
    resolved = "resolved"
    cancelled = "cancelled"


class FacilityType(str, Enum):
    hospital = "hospital"
    clinic = "clinic"
    pharmacy = "pharmacy"
    diagnostic_center = "diagnostic_center"


# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.patient


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"


class TokenData(BaseModel):
    user_id: Optional[str] = None


# User Schemas
class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    """
    Flat body for PUT /profile - matches what the frontend's profile edit
    form actually sends (user fields and role-specific fields together at
    the top level, not nested under separate keys).
    """
    # User fields
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    # Patient fields
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    division: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_conditions: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None
    # Provider fields
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    qualification: Optional[str] = None
    years_of_experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    available_for_telemedicine: Optional[bool] = None
    is_available: Optional[bool] = None
    languages: Optional[List[str]] = None
    bio: Optional[str] = None


# Patient Profile Schemas
class PatientProfileCreate(BaseModel):
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    division: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    current_medications: Optional[List[str]] = []


class PatientProfileResponse(PatientProfileCreate):
    id: str
    user_id: str

    class Config:
        from_attributes = True


# Provider Profile Schemas
class ProviderProfileCreate(BaseModel):
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    qualification: Optional[str] = None
    years_of_experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    available_for_telemedicine: bool = True
    is_available: bool = True
    languages: Optional[List[str]] = []
    bio: Optional[str] = None
    district: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ProviderProfileResponse(ProviderProfileCreate):
    id: str
    user_id: str

    class Config:
        from_attributes = True


class ProviderWithUser(BaseModel):
    id: str
    user_id: str
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    qualification: Optional[str] = None
    years_of_experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    available_for_telemedicine: bool
    is_available: bool
    languages: Optional[List[str]] = []
    bio: Optional[str] = None
    district: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    user: UserResponse

    class Config:
        from_attributes = True


# Medical Facility Schemas
class FacilityCreate(BaseModel):
    name: str
    facility_type: FacilityType
    phone: Optional[str] = None
    address: str
    village: Optional[str] = None
    district: str
    division: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    operating_hours: Optional[str] = None
    services_offered: Optional[List[str]] = []
    has_ambulance: bool = False
    has_emergency: bool = False
    contact_person: Optional[str] = None


class FacilityResponse(FacilityCreate):
    id: str
    is_active: bool
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Symptom Check Schemas
class SymptomCheckCreate(BaseModel):
    symptoms: str  # Comma-separated string
    severity: Optional[str] = None
    duration: Optional[str] = None
    additional_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    suggested_conditions: Optional[List[str]] = None


class SymptomCheckResponse(BaseModel):
    id: str
    user_id: str
    symptoms: List[str]
    severity: str
    duration: Optional[str] = None
    additional_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    suggested_conditions: List[str]
    recommendations: Optional[str] = None
    synced: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Consultation Schemas
class ConsultationCreate(BaseModel):
    provider_id: Optional[str] = None
    consultation_type: str
    scheduled_at: Optional[datetime] = None
    symptoms: Optional[str] = None
    notes: Optional[str] = None


class ConsultationResponse(BaseModel):
    id: str
    patient_id: str
    provider_id: Optional[str] = None
    facility_id: Optional[str] = None
    consultation_type: str
    status: ConsultationStatus
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    meeting_link: Optional[str] = None
    created_at: datetime
    patient: Optional[UserResponse] = None
    provider: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# Emergency SOS Schemas
class EmergencyCreate(BaseModel):
    latitude: float
    longitude: float
    location: Optional[str] = None
    emergency_type: str = "medical"
    description: Optional[str] = None


class EmergencyResponse(BaseModel):
    id: str
    patient_id: str
    responder_id: Optional[str] = None
    location_latitude: float
    location_longitude: float
    location_address: Optional[str] = None
    emergency_type: str
    description: Optional[str] = None
    status: EmergencyStatus
    responded_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    patient: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# Medical Record Schemas
class MedicalRecordCreate(BaseModel):
    record_type: str
    title: str
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    prescriptions: Optional[dict] = None
    attachments: Optional[List[str]] = None
    provider_id: Optional[str] = None
    consultation_id: Optional[str] = None


class MedicalRecordResponse(BaseModel):
    id: str
    patient_id: str
    provider_id: Optional[str] = None
    consultation_id: Optional[str] = None
    record_type: str
    title: str
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    prescriptions: Optional[dict] = None
    attachments: Optional[List[str]] = None
    document_url: Optional[str] = None
    record_date: date
    created_at: datetime
    provider: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# AI Chat Schemas
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


# Medicine Suggestion Schemas
class MedicineSuggestionRequest(BaseModel):
    prescriptions: dict
    diagnosis: Optional[str] = None
    patientHistory: Optional[str] = None


class MedicineSuggestion(BaseModel):
    medicine: str
    reason: str
    shouldTake: Optional[str] = None  # "YES - Continue taking" | "NO - Not needed" | "CONSULT - Requires doctor"
    alternatives: List[str]
    precautions: List[str]
    interactions: List[str]
    effectiveness: str


class MedicineSuggestionResponse(BaseModel):
    suggestions: List[MedicineSuggestion]
    overallRecommendation: str
    warnings: List[str]


# OCR Schemas
class OCRRequest(BaseModel):
    image: str  # Base64 encoded image


class OCRMedicine(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str


class OCRResponse(BaseModel):
    doctorName: Optional[str] = None
    date: Optional[str] = None
    diagnosis: Optional[str] = None
    medicines: List[OCRMedicine]
    instructions: Optional[str] = None
    rawText: str


# Profile Response with all data
class FullProfileResponse(BaseModel):
    profile: UserResponse
    additionalData: Optional[PatientProfileResponse | ProviderProfileResponse] = None


# Update Token to include UserResponse
Token.model_rebuild()

