"""
Bisheshoggo AI - Database Seeder
Populates medical facilities and a handful of volunteer doctor accounts
(with provider profiles) so the "Find Volunteers" feature isn't empty.
"""
from sqlalchemy.orm import Session
from .database import SessionLocal, init_db
from .models import MedicalFacility, FacilityType, User, UserRole, ProviderProfile
from .auth import get_password_hash


VOLUNTEER_DOCTORS = [
    {
        "email": "dr.rahman@bisheshoggo.ai",
        "full_name": "Dr. Rahman Ahmed",
        "specialization": "General Physician",
        "phone": "+880 1712-345678",
        "location": "Bandarban Sadar",
        "district": "Bandarban",
        "latitude": 22.1953,
        "longitude": 92.2184,
        "languages": ["Bengali", "Chakma", "English"],
        "years_of_experience": 15,
    },
    {
        "email": "dr.fatima@bisheshoggo.ai",
        "full_name": "Dr. Fatima Khan",
        "specialization": "Pediatrician",
        "phone": "+880 1812-456789",
        "location": "Thanchi",
        "district": "Bandarban",
        "latitude": 21.9167,
        "longitude": 92.4667,
        "languages": ["Bengali", "Marma"],
        "years_of_experience": 10,
    },
    {
        "email": "dr.kamal@bisheshoggo.ai",
        "full_name": "Dr. Kamal Hossain",
        "specialization": "Surgeon",
        "phone": "+880 1912-567890",
        "location": "Khagrachari Sadar",
        "district": "Khagrachari",
        "latitude": 23.1193,
        "longitude": 91.9847,
        "languages": ["Bengali", "Tripura", "English"],
        "years_of_experience": 20,
    },
    {
        "email": "dr.nusrat@bisheshoggo.ai",
        "full_name": "Dr. Nusrat Jahan",
        "specialization": "Gynecologist",
        "phone": "+880 1612-678901",
        "location": "Rangamati Sadar",
        "district": "Rangamati",
        "latitude": 22.6372,
        "longitude": 92.2061,
        "languages": ["Bengali", "Chakma"],
        "years_of_experience": 12,
    },
    {
        "email": "dr.amir@bisheshoggo.ai",
        "full_name": "Dr. Amir Ali",
        "specialization": "Cardiologist",
        "phone": "+880 1512-789012",
        "location": "Ruma",
        "district": "Bandarban",
        "latitude": 22.0167,
        "longitude": 92.4000,
        "languages": ["Bengali", "English"],
        "years_of_experience": 18,
    },
    {
        "email": "dr.sabina@bisheshoggo.ai",
        "full_name": "Dr. Sabina Akter",
        "specialization": "Dermatologist",
        "phone": "+880 1712-890123",
        "location": "Dighinala",
        "district": "Khagrachari",
        "latitude": 23.1700,
        "longitude": 92.1600,
        "languages": ["Bengali", "Chakma", "English"],
        "years_of_experience": 8,
    },
    {
        "email": "dr.mizanur@bisheshoggo.ai",
        "full_name": "Dr. Mizanur Rahman",
        "specialization": "Orthopedic Surgeon",
        "phone": "+880 1812-901234",
        "location": "Belaichhari",
        "district": "Rangamati",
        "latitude": 23.0167,
        "longitude": 92.3167,
        "languages": ["Bengali", "Marma"],
        "years_of_experience": 14,
    },
    {
        "email": "dr.ayesha@bisheshoggo.ai",
        "full_name": "Dr. Ayesha Siddique",
        "specialization": "ENT Specialist",
        "phone": "+880 1912-012345",
        "location": "Lama",
        "district": "Bandarban",
        "latitude": 21.7833,
        "longitude": 92.2000,
        "languages": ["Bengali", "Tripura", "English"],
        "years_of_experience": 11,
    },
]


def seed_volunteer_doctors(db: Session):
    """Seed a handful of volunteer doctor accounts + provider profiles."""
    if db.query(ProviderProfile).first():
        print("[*] Volunteer doctors already seeded!")
        return

    print("[*] Seeding volunteer doctors...")
    placeholder_password = get_password_hash("Bisheshoggo2025!")

    for doc in VOLUNTEER_DOCTORS:
        user = User(
            email=doc["email"],
            hashed_password=placeholder_password,
            full_name=doc["full_name"],
            phone=doc["phone"],
            role=UserRole.doctor,
            is_active=True,
        )
        db.add(user)
        db.flush()  # assign user.id before creating the linked profile

        db.add(ProviderProfile(
            user_id=user.id,
            specialization=doc["specialization"],
            qualification="MBBS",
            years_of_experience=doc["years_of_experience"],
            available_for_telemedicine=True,
            is_available=True,
            languages=doc["languages"],
            district=doc["district"],
            location=doc["location"],
            latitude=doc["latitude"],
            longitude=doc["longitude"],
        ))

    db.commit()
    print(f"[+] Created {len(VOLUNTEER_DOCTORS)} volunteer doctor accounts")


def seed_database():
    """Seed the database with medical facilities and volunteer doctors"""
    db = SessionLocal()

    try:
        seed_volunteer_doctors(db)

        # Check if already seeded
        if db.query(MedicalFacility).first():
            print("[*] Database already seeded!")
            return

        print("[*] Seeding database with medical facilities...")
        
        # Create medical facilities
        facilities = [
            MedicalFacility(
                name="Bandarban Sadar Hospital",
                facility_type=FacilityType.hospital,
                phone="+880361-62233",
                address="Hospital Road, Bandarban Sadar",
                district="Bandarban",
                division="Chittagong",
                latitude=22.1953,
                longitude=92.2184,
                operating_hours="24/7",
                services_offered=["Emergency", "General Medicine", "Surgery", "Maternity"],
                has_ambulance=True,
                has_emergency=True,
                is_active=True
            ),
            MedicalFacility(
                name="Thanchi Upazila Health Complex",
                facility_type=FacilityType.clinic,
                phone="+880361-75012",
                address="Thanchi Upazila, Bandarban",
                district="Bandarban",
                division="Chittagong",
                latitude=21.9167,
                longitude=92.4667,
                operating_hours="8:00 AM - 8:00 PM",
                services_offered=["General Medicine", "Vaccination", "Family Planning"],
                has_ambulance=False,
                has_emergency=True,
                is_active=True
            ),
            MedicalFacility(
                name="Ruma Community Clinic",
                facility_type=FacilityType.clinic,
                phone="+880361-76234",
                address="Ruma Sadar, Bandarban",
                district="Bandarban",
                division="Chittagong",
                latitude=22.0167,
                longitude=92.4000,
                operating_hours="9:00 AM - 5:00 PM",
                services_offered=["Primary Care", "First Aid", "Health Education"],
                has_ambulance=False,
                has_emergency=False,
                is_active=True
            ),
            MedicalFacility(
                name="Bandarban Pharmacy",
                facility_type=FacilityType.pharmacy,
                phone="+880361-63000",
                address="Main Road, Bandarban Sadar",
                district="Bandarban",
                division="Chittagong",
                latitude=22.1960,
                longitude=92.2190,
                operating_hours="8:00 AM - 10:00 PM",
                services_offered=["Prescription Medicines", "OTC Medicines", "Medical Supplies"],
                has_ambulance=False,
                has_emergency=False,
                is_active=True
            ),
            MedicalFacility(
                name="Khagrachari District Hospital",
                facility_type=FacilityType.hospital,
                phone="+880371-61234",
                address="Hospital Road, Khagrachari Sadar",
                district="Khagrachari",
                division="Chittagong",
                latitude=23.1193,
                longitude=91.9847,
                operating_hours="24/7",
                services_offered=["Emergency", "General Medicine", "Pediatrics", "Gynecology"],
                has_ambulance=True,
                has_emergency=True,
                is_active=True
            ),
            MedicalFacility(
                name="Rangamati General Hospital",
                facility_type=FacilityType.hospital,
                phone="+880351-62345",
                address="Hospital Road, Rangamati Sadar",
                district="Rangamati",
                division="Chittagong",
                latitude=22.6372,
                longitude=92.2061,
                operating_hours="24/7",
                services_offered=["Emergency", "General Medicine", "Surgery", "Diagnostics"],
                has_ambulance=True,
                has_emergency=True,
                is_active=True
            ),
        ]
        
        db.add_all(facilities)
        db.commit()
        
        print("[+] Database seeded successfully!")
        print(f"[+] Created {len(facilities)} medical facilities")
        print("")
        
    except Exception as e:
        db.rollback()
        print(f"[-] Error seeding database: {e}")
    finally:
        db.close()
