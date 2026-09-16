"""
Bisheshoggo AI - Offline Dr (Symptom Check) Routes
Powered by Local LLaMA Stack for Offline AI Diagnosis
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
import re
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..config import settings

router = APIRouter(prefix="/symptom-check", tags=["Offline Dr"])


def call_local_llama(prompt: str) -> dict:
    """
    Call local LLaMA Stack for AI-powered diagnosis
    Falls back to rule-based system if LLaMA is unavailable
    """
    try:
        from llama_stack_client import LlamaStackClient
        
        print("🦙 Attempting to connect to Local LLaMA Stack...")
        
        # Connect to local LLaMA Stack (default port 5001)
        client = LlamaStackClient(
            base_url="http://localhost:5001",
        )
        
        # Call LLaMA for medical diagnosis
        response = client.inference.chat_completion(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model_id="Llama3.2-3B-Instruct",  # Use the model you have installed
            stream=False,
        )
        
        # Extract the response content
        content = response.completion_message.content
        print(f"✅ LLaMA Response received: {content[:100]}...")
        
        # Try to parse as JSON
        try:
            result = json.loads(content)
            print("✅ Successfully parsed LLaMA JSON response")
            return result
        except json.JSONDecodeError:
            # If not JSON, extract key information
            print("⚠️ LLaMA response not JSON, extracting information...")
            return {
                "diagnosis": content.split('\n')[0] if content else "General Health Concern",
                "suggested_conditions": ["Requires Professional Evaluation"],
                "recommendations": content,
                "urgency_level": "moderate",
                "home_remedies": [],
                "warning_signs": [],
                "should_see_doctor": True
            }
    
    except ImportError:
        print("⚠️ llama-stack-client not installed")
        return None
    except Exception as e:
        print(f"⚠️ LLaMA Stack Error: {e}")
        print("   Falling back to rule-based diagnosis...")
        return None


def analyze_symptoms_locally(symptoms: List[str], severity: str, duration: str, additional_notes: str):
    """
    Local AI-powered symptom analysis using rule-based system + LLaMA
    Works completely offline
    """
    symptoms_lower = [s.lower() for s in symptoms]
    
    # Initialize result
    diagnosis = ""
    conditions = []
    recommendations = ""
    urgency = "moderate"
    home_remedies = []
    warning_signs = []
    should_see_doctor = False
    
    # Rule-based analysis for common conditions in Bangladesh
    
    # EMERGENCY CONDITIONS
    if any(s in symptoms_lower for s in ["chest pain", "difficulty breathing", "severe bleeding", "unconscious", "seizure"]):
        diagnosis = "Emergency Medical Condition"
        conditions = ["Requires Immediate Medical Attention"]
        recommendations = "🚨 জরুরি! অবিলম্বে নিকটতম হাসপাতালে যান অথবা জরুরি সেবায় কল করুন। এই লক্ষণগুলি গুরুতর অবস্থা নির্দেশ করতে পারে।"
        urgency = "emergency"
        warning_signs = ["Do not delay treatment", "Call emergency services immediately"]
        should_see_doctor = True
        home_remedies = ["Keep patient calm", "Loosen tight clothing", "Monitor breathing"]
        return {
            "diagnosis": diagnosis,
            "suggested_conditions": conditions,
            "recommendations": recommendations,
            "urgency_level": urgency,
            "home_remedies": home_remedies,
            "warning_signs": warning_signs,
            "should_see_doctor": should_see_doctor
        }
    
    # FEVER + RESPIRATORY
    if "fever" in symptoms_lower or "জ্বর" in symptoms_lower:
        if any(s in symptoms_lower for s in ["cough", "cold", "runny nose", "sore throat", "কাশি"]):
            diagnosis = "Viral Upper Respiratory Infection (Common Cold/Flu)"
            conditions = ["Common Cold (সাধারণ ঠান্ডা)", "Influenza (ফ্লু)", "Viral Fever (ভাইরাল জ্বর)"]
            recommendations = """
🏠 ঘরে থাকুন এবং বিশ্রাম নিন।
💧 প্রচুর পরিমাণে পানি এবং তরল খাবার খান।
🍵 গরম পানি, আদা চা, মধু ও লেবু খান।
💊 জ্বরের জন্য প্যারাসিটামল (৫০০mg) প্রতি ৬ ঘন্টায় নিতে পারেন।
⚠️ ৩ দিনের বেশি জ্বর থাকলে ডাক্তার দেখান।
"""
            urgency = "moderate" if severity == "severe" else "low"
            home_remedies = [
                "গরম পানিতে গার্গল করুন",
                "আদা-মধু-লেবু চা পান করুন",
                "বাষ্প নিন (Steam inhalation)",
                "হালকা গরম খাবার খান",
                "পর্যাপ্ত ঘুমান"
            ]
            warning_signs = ["High fever above 103°F (39.4°C)", "Difficulty breathing", "Chest pain", "Confusion"]
            should_see_doctor = severity == "severe"
        else:
            diagnosis = "Fever (Unknown Origin)"
            conditions = ["Viral Fever", "Bacterial Infection", "Typhoid (if prolonged)"]
            recommendations = """
💊 প্যারাসিটামল নিন এবং শরীর মুছুন।
💧 প্রচুর পানি পান করুন।
🛏️ বিশ্রাম নিন।
⚠️ ২-৩ দিনের মধ্যে ভালো না হলে রক্ত পরীক্ষা করান।
"""
            urgency = "moderate"
            home_remedies = ["শরীর কুসুম গরম পানিতে মুছুন", "হালকা পোশাক পরুন", "বেশি করে পানি খান"]
            warning_signs = ["Fever lasting more than 3 days", "Very high fever", "Rash", "Severe headache"]
            should_see_doctor = True
    
    # GASTROINTESTINAL
    elif any(s in symptoms_lower for s in ["diarrhea", "vomiting", "stomach pain", "nausea", "পেট ব্যথা", "বমি", "পাতলা পায়খানা"]):
        diagnosis = "Gastrointestinal Infection"
        conditions = ["Gastroenteritis (পেটের অসুখ)", "Food Poisoning (খাদ্যে বিষক্রিয়া)", "Stomach Flu"]
        recommendations = """
💧 ORS (খাওয়ার স্যালাইন) খান - এটা সবচেয়ে গুরুত্বপূর্ণ!
🍌 কলা, ভাত, টোস্ট, আপেল (BRAT diet) খান।
❌ তেলে ভাজা ও মসলাযুক্ত খাবার এড়িয়ে চলুন।
💊 প্রয়োজনে Flagyl বা Ciprofloxacin ডাক্তারের পরামর্শে নিন।
⚠️ রক্ত পায়খানা হলে অবশ্যই ডাক্তার দেখান।
"""
        urgency = "moderate"
        home_remedies = [
            "ঘরে তৈরি স্যালাইন (১ লিটার পানি + ৬ চা চামচ চিনি + ½ চা চামচ লবণ)",
            "আদা চা",
            "পুদিনা পাতার রস",
            "নারিকেল পানি"
        ]
        warning_signs = ["Blood in stool", "Severe dehydration", "High fever", "Unable to keep fluids down"]
        should_see_doctor = "blood" in " ".join(symptoms_lower) or severity == "severe"
    
    # HEADACHE
    elif any(s in symptoms_lower for s in ["headache", "মাথা ব্যথা", "migraine"]):
        diagnosis = "Headache / Migraine"
        conditions = ["Tension Headache (টেনশন মাথা ব্যথা)", "Migraine (মাইগ্রেন)", "Sinus Headache"]
        recommendations = """
🛏️ অন্ধকার, শান্ত ঘরে বিশ্রাম নিন।
💊 প্যারাসিটামল বা Ibuprofen নিতে পারেন।
💧 পর্যাপ্ত পানি পান করুন।
☕ ক্যাফেইন সাময়িক আরাম দিতে পারে।
🧘 চাপ কমান, পর্যাপ্ত ঘুমান।
"""
        urgency = "low"
        home_remedies = [
            "কপালে ঠান্ডা কাপড় দিন",
            "পিপারমিন্ট তেল মালিশ করুন",
            "গরম আদা চা",
            "চোখ বন্ধ করে বিশ্রাম নিন"
        ]
        warning_signs = ["Sudden severe headache", "Headache with fever and stiff neck", "Vision problems", "Confusion"]
        should_see_doctor = severity == "severe" or "vision" in " ".join(symptoms_lower)
    
    # SKIN PROBLEMS
    elif any(s in symptoms_lower for s in ["rash", "itching", "skin", "চুলকানি", "ফুসকুড়ি"]):
        diagnosis = "Skin Condition / Allergic Reaction"
        conditions = ["Allergic Dermatitis", "Fungal Infection", "Eczema", "Scabies (খোস-পাঁচড়া)"]
        recommendations = """
🧴 ক্যালামাইন লোশন লাগান।
💊 অ্যান্টিহিস্টামিন (Cetirizine/Fexofenadine) খেতে পারেন।
🚿 ঠান্ডা পানিতে গোসল করুন।
❌ আঁচড়াবেন না।
👕 ঢিলা সুতি কাপড় পরুন।
"""
        urgency = "low"
        home_remedies = [
            "নিম পাতা সেদ্ধ পানি দিয়ে ধুয়ে নিন",
            "অ্যালোভেরা জেল লাগান",
            "নারিকেল তেল",
            "ঠান্ডা সেঁক দিন"
        ]
        warning_signs = ["Spreading rash", "Difficulty breathing", "Swelling of face/throat", "Fever with rash"]
        should_see_doctor = "breathing" in " ".join(symptoms_lower) or "swelling" in " ".join(symptoms_lower)
    
    # BODY PAIN / WEAKNESS
    elif any(s in symptoms_lower for s in ["body ache", "weakness", "fatigue", "শরীর ব্যথা", "দুর্বলতা"]):
        diagnosis = "General Weakness / Body Pain"
        conditions = ["Viral Infection", "Fatigue", "Anemia (রক্তশূন্যতা)", "Vitamin Deficiency"]
        recommendations = """
🛏️ পর্যাপ্ত বিশ্রাম নিন।
🥗 পুষ্টিকর খাবার খান - শাকসবজি, ফল, ডিম, মাছ।
💧 পানি বেশি খান।
💊 মাল্টিভিটামিন খেতে পারেন।
⚠️ দুর্বলতা অনেকদিন থাকলে রক্ত পরীক্ষা করান।
"""
        urgency = "low"
        home_remedies = [
            "কলিজা/মাংস খান (আয়রনের জন্য)",
            "লেবু পানি",
            "খেজুর",
            "দুধ-কলা"
        ]
        warning_signs = ["Extreme fatigue", "Shortness of breath", "Rapid heartbeat", "Dizziness when standing"]
        should_see_doctor = duration and ("week" in duration.lower() or "weeks" in duration.lower())
    
    # DEFAULT
    else:
        diagnosis = "General Health Concern"
        conditions = ["Requires Professional Evaluation", "General Illness"]
        recommendations = """
আপনার লক্ষণগুলি আরও মূল্যায়নের প্রয়োজন।
🏥 নিকটতম স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।
📝 আপনার সব লক্ষণ লিখে রাখুন।
💊 নিজে ওষুধ না খেয়ে ডাক্তারের পরামর্শ নিন।
"""
        urgency = "moderate"
        home_remedies = ["বিশ্রাম নিন", "পানি খান", "পুষ্টিকর খাবার খান"]
        warning_signs = ["Worsening symptoms", "New symptoms developing", "Persistent discomfort"]
        should_see_doctor = True
    
    # Adjust urgency based on severity
    if severity == "severe" and urgency != "emergency":
        urgency = "high"
        should_see_doctor = True
    
    return {
        "diagnosis": diagnosis,
        "suggested_conditions": conditions,
        "recommendations": recommendations,
        "urgency_level": urgency,
        "home_remedies": home_remedies,
        "warning_signs": warning_signs,
        "should_see_doctor": should_see_doctor
    }


@router.post("", response_model=dict)
async def create_symptom_check(
    check_data: schemas.SymptomCheckCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Offline Dr - AI-powered symptom analysis
    Works completely offline using local LLaMA model
    """
    try:
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("🩺 OFFLINE DR - Analyzing Symptoms...")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
        # Convert comma-separated symptoms to array
        symptoms_list = [s.strip() for s in check_data.symptoms.split(",")]
        print(f"📋 Symptoms: {symptoms_list}")
        print(f"⚡ Severity: {check_data.severity}")
        print(f"⏱️ Duration: {check_data.duration}")
        
        # Get patient medical history
        patient_profile = db.query(models.PatientProfile).filter(
            models.PatientProfile.user_id == current_user.id
        ).first()
        
        medical_history = ""
        if patient_profile:
            medical_history = f"""
Blood Group: {patient_profile.blood_group or 'N/A'}
Gender: {patient_profile.gender or 'N/A'}
Medical Conditions: {', '.join(patient_profile.medical_conditions or [])}
Allergies: {', '.join(patient_profile.allergies or [])}
Current Medications: {', '.join(patient_profile.current_medications or [])}
"""
        
        # Try Local LLaMA Stack first
        llama_prompt = f"""You are an expert medical AI assistant for rural Bangladesh. Analyze these symptoms and provide a diagnosis.

Patient Information:
{medical_history}

Current Symptoms: {', '.join(symptoms_list)}
Severity: {check_data.severity or 'Not specified'}
Duration: {check_data.duration or 'Not specified'}
Additional Notes: {check_data.additional_notes or 'None'}

Provide your response in the following JSON format:
{{
    "diagnosis": "Primary diagnosis in Bengali and English",
    "suggested_conditions": ["Condition 1", "Condition 2", "Condition 3"],
    "recommendations": "Detailed recommendations in Bengali including when to seek medical care",
    "urgency_level": "low" | "moderate" | "high" | "emergency",
    "home_remedies": ["Remedy 1 in Bengali", "Remedy 2 in Bengali"],
    "warning_signs": ["Warning sign 1", "Warning sign 2"],
    "should_see_doctor": true | false
}}

Consider:
- Limited access to healthcare facilities in Bangladesh
- Common conditions in rural areas
- Home remedies with local ingredients
- When immediate medical attention is needed
- Provide recommendations in Bengali language"""

        print("🤖 Trying Groq (GPT-OSS-120B) for AI diagnosis...")
        try:
            from ..ai_service import ai_symptom_analysis
            ai_result = await ai_symptom_analysis(
                symptoms=symptoms_list,
                severity=check_data.severity or "moderate",
                duration=check_data.duration or "",
                additional_notes=check_data.additional_notes or ""
            )
            model_used = ai_result.get("model", "Groq")
            print(f"✅ AI analysis complete")
        except Exception as ai_error:
            print(f"⚠️ AI Error: {ai_error}")
            print("🦙 Trying Local LLaMA Stack for AI diagnosis...")
            ai_result = call_local_llama(llama_prompt)
        
            # If LLaMA fails, use rule-based system
            if ai_result is None:
                print("📋 Using rule-based diagnosis system...")
                ai_result = analyze_symptoms_locally(
                    symptoms=symptoms_list,
                    severity=check_data.severity or "moderate",
                    duration=check_data.duration or "",
                    additional_notes=check_data.additional_notes or ""
                )
                model_used = "Rule-based System"
            else:
                model_used = "Local LLaMA Stack"
        
        print(f"✅ Diagnosis: {ai_result['diagnosis']}")
        print(f"🚨 Urgency: {ai_result['urgency_level']}")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
        # Store in database
        db_check = models.SymptomCheck(
            user_id=current_user.id,
            symptoms=symptoms_list,
            severity=check_data.severity or ai_result.get("urgency_level", "moderate"),
            duration=check_data.duration,
            additional_notes=check_data.additional_notes,
            diagnosis=ai_result.get("diagnosis", ""),
            recommendations=ai_result.get("recommendations", ""),
            suggested_conditions=ai_result.get("suggested_conditions", []),
            synced=True
        )
        
        db.add(db_check)
        db.commit()
        db.refresh(db_check)
        
        # Convert to dict for serialization
        check_data_dict = {
            "id": db_check.id,
            "user_id": db_check.user_id,
            "symptoms": db_check.symptoms,
            "severity": db_check.severity,
            "duration": db_check.duration,
            "additional_notes": db_check.additional_notes,
            "diagnosis": db_check.diagnosis,
            "recommended": db_check.recommendations,
            "suggested_conditions": db_check.suggested_conditions,
            "synced": db_check.synced,
            "created_at": db_check.created_at.isoformat() if db_check.created_at else None
        }
        
        # Return combined result
        return {
            "success": True,
            "data": check_data_dict,
            "ai_analysis": ai_result,
            "offline_mode": True,
            "model": f"Offline Dr ({model_used})"
        }
    
    except Exception as e:
        print(f"[Offline Dr] Error: {e}")
        # Fallback: still provide basic analysis
        symptoms_list = [s.strip() for s in check_data.symptoms.split(",")]
        
        # Basic fallback analysis
        ai_result = analyze_symptoms_locally(
            symptoms=symptoms_list,
            severity=check_data.severity or "moderate",
            duration=check_data.duration or "",
            additional_notes=check_data.additional_notes or ""
        )
        
        db_check = models.SymptomCheck(
            user_id=current_user.id,
            symptoms=symptoms_list,
            severity=check_data.severity,
            duration=check_data.duration,
            additional_notes=check_data.additional_notes,
            diagnosis=ai_result.get("diagnosis", ""),
            recommendations=ai_result.get("recommendations", ""),
            synced=True
        )
        
        db.add(db_check)
        db.commit()
        db.refresh(db_check)
        
        check_data_dict = {
            "id": db_check.id,
            "user_id": db_check.user_id,
            "symptoms": db_check.symptoms,
            "severity": db_check.severity,
            "duration": db_check.duration,
            "additional_notes": db_check.additional_notes,
            "synced": db_check.synced,
            "created_at": db_check.created_at.isoformat() if db_check.created_at else None
        }
        
        return {
            "success": True,
            "data": check_data_dict,
            "ai_analysis": ai_result,
            "offline_mode": True,
            "model": "Offline Dr (Rule-based)"
        }


@router.get("", response_model=dict)
async def get_symptom_checks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all symptom checks for current user"""
    checks = db.query(models.SymptomCheck).filter(
        models.SymptomCheck.user_id == current_user.id
    ).order_by(models.SymptomCheck.created_at.desc()).limit(50).all()

    return {"data": [schemas.SymptomCheckResponse.model_validate(c).model_dump(mode="json") for c in checks]}

