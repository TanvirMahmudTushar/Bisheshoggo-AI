"""
Bisheshoggo AI - SQLAlchemy Database Models
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, 
    ForeignKey, Enum, JSON, Date
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


# Enums
class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    community_health_worker = "community_health_worker"
    pharmacy = "pharmacy"
    clinic = "clinic"


class ConsultationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class EmergencyStatus(str, enum.Enum):
    active = "active"
    responded = "responded"
    resolved = "resolved"
    cancelled = "cancelled"


class FacilityType(str, enum.Enum):
    hospital = "hospital"
    clinic = "clinic"
    pharmacy = "pharmacy"
    diagnostic_center = "diagnostic_center"


# User Model
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.patient, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    provider_profile = relationship("ProviderProfile", back_populates="user", uselist=False)
    symptom_checks = relationship("SymptomCheck", back_populates="user")
    patient_consultations = relationship("Consultation", foreign_keys="Consultation.patient_id", back_populates="patient")
    provider_consultations = relationship("Consultation", foreign_keys="Consultation.provider_id", back_populates="provider")
    emergency_sos = relationship("EmergencySOS", foreign_keys="EmergencySOS.patient_id", back_populates="patient")
    medical_records = relationship("MedicalRecord", foreign_keys="MedicalRecord.patient_id", back_populates="patient")


# Patient Profile
class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    date_of_birth = Column(Date, nullable=True)
    blood_group = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    village = Column(String, nullable=True)
    district = Column(String, nullable=True)
    division = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    medical_conditions = Column(JSON, default=list)
    allergies = Column(JSON, default=list)
    current_medications = Column(JSON, default=list)
    
    # Relationships
    user = relationship("User", back_populates="patient_profile")


# Healthcare Provider Profile
class ProviderProfile(Base):
    __tablename__ = "provider_profiles"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    specialization = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    qualification = Column(String, nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    consultation_fee = Column(Float, nullable=True)
    available_for_telemedicine = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)
    languages = Column(JSON, default=list)
    bio = Column(Text, nullable=True)
    district = Column(String, nullable=True)
    location = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Relationships
    user = relationship("User", back_populates="provider_profile")


# Medical Facility
class MedicalFacility(Base):
    __tablename__ = "medical_facilities"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    facility_type = Column(Enum(FacilityType), nullable=False)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=False)
    village = Column(String, nullable=True)
    district = Column(String, nullable=False)
    division = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    operating_hours = Column(String, nullable=True)
    services_offered = Column(JSON, default=list)
    has_ambulance = Column(Boolean, default=False)
    has_emergency = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    contact_person = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Symptom Check
class SymptomCheck(Base):
    __tablename__ = "symptom_checks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    symptoms = Column(JSON, nullable=False)  # Array of symptoms
    severity = Column(String, nullable=False)
    duration = Column(String, nullable=True)
    additional_notes = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)  # AI-generated diagnosis
    suggested_conditions = Column(JSON, default=list)
    recommendations = Column(Text, nullable=True)
    synced = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="symptom_checks")


# Consultation
class Consultation(Base):
    __tablename__ = "consultations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    facility_id = Column(String, ForeignKey("medical_facilities.id", ondelete="SET NULL"), nullable=True)
    consultation_type = Column(String, nullable=False)  # 'video', 'chat', 'in_person'
    status = Column(Enum(ConsultationStatus), default=ConsultationStatus.pending, nullable=False)
    symptoms = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    meeting_link = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_consultations")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="provider_consultations")
    messages = relationship("ConsultationMessage", back_populates="consultation")


# Emergency SOS
class EmergencySOS(Base):
    __tablename__ = "emergency_sos"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    responder_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    location_latitude = Column(Float, nullable=False)
    location_longitude = Column(Float, nullable=False)
    location_address = Column(Text, nullable=True)
    emergency_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(EmergencyStatus), default=EmergencyStatus.active, nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="emergency_sos")
    responder = relationship("User", foreign_keys=[responder_id])


# Medical Record
class MedicalRecord(Base):
    __tablename__ = "medical_records"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    consultation_id = Column(String, ForeignKey("consultations.id", ondelete="SET NULL"), nullable=True)
    record_type = Column(String, nullable=False)  # 'prescription', 'lab_report', 'imaging', etc.
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    prescriptions = Column(JSON, nullable=True)
    attachments = Column(JSON, nullable=True)
    document_url = Column(String, nullable=True)
    record_date = Column(Date, server_default=func.current_date())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="medical_records")
    provider = relationship("User", foreign_keys=[provider_id])


# Consultation Messages
class ConsultationMessage(Base):
    __tablename__ = "consultation_messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    attachment_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    consultation = relationship("Consultation", back_populates="messages")
    sender = relationship("User")


# Offline Sync Queue
class OfflineSyncQueue(Base):
    __tablename__ = "offline_sync_queue"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String, nullable=False)
    table_name = Column(String, nullable=False)
    data = Column(JSON, nullable=False)
    synced = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    synced_at = Column(DateTime(timezone=True), nullable=True)

