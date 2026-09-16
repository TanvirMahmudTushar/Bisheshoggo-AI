"""
Bisheshoggo AI - AI Service
Groq's GPT-OSS-120B is the primary model for all medical AI features.
Falls back to a Gemma model via Google's GenAI API if Groq is unavailable.
"""
import json
import re
from .config import settings

# ── Model identifiers ────────────────────────────────────────────
GROQ_MODEL = "openai/gpt-oss-120b"    # primary
GEMMA_MODEL = "gemma-4-31b-it"        # fallback via Google GenAI


# ── System instruction ───────────────────────────────────────
SYSTEM_INSTRUCTION = """You are a medical AI assistant for Bisheshoggo AI, a healthcare platform for rural Bangladesh's Hill Tracts region.

Your capabilities:
- Evidence-based medical symptom analysis and triage
- Medication information and interaction checking
- Health education in simple, accessible language
- Clinical decision support for community health workers
- Culturally sensitive health guidance for rural Bangladesh

Guidelines:
- Always recommend professional medical consultation for serious symptoms
- Use simple language accessible to users with limited medical knowledge
- Consider the rural context with limited healthcare access
- Provide practical guidance including home remedies for minor ailments
- Be empathetic, supportive, and culturally sensitive
- Include Bengali (বাংলা) translations where helpful
- Flag emergency symptoms clearly with urgency levels
- Never provide definitive diagnoses - frame as possibilities requiring professional evaluation"""


# ── Groq (primary) ────────────────────────────────────────────
def _get_groq_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


# ── Gemma API fallback ────────────────────────────────────────
def _get_gemma_fallback_client():
    """Get Google GenAI client for Gemma API fallback."""
    if not settings.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY required for Gemma fallback")
    from google import genai
    return genai.Client(api_key=settings.GOOGLE_API_KEY)


# ═══════════════════════════════════════════════════════════════
#  PUBLIC API  (same signatures the rest of the app relies on)
# ═══════════════════════════════════════════════════════════════

async def ai_chat(messages: list, stream: bool = False):
    """
    Chat for medical Q&A. Tries Groq (GPT-OSS-120B) first, falls back to Gemma API.
    """
    # ── Try Groq (primary) ──
    try:
        client = _get_groq_client()
        chat_messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
        chat_messages.extend({"role": m["role"], "content": m["content"]} for m in messages)

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=chat_messages,
        )
        return {"content": response.choices[0].message.content, "model": GROQ_MODEL}
    except Exception as e:
        print(f"[AI] Groq chat failed ({e}), falling back to Gemma API...")

    # ── Gemma API fallback ──
    try:
        from google.genai import types
        client = _get_gemma_fallback_client()

        contents = [
            types.Content(
                role="user",
                parts=[types.Part(text=f"[System Instructions]\n{SYSTEM_INSTRUCTION}\n[End System Instructions]\nPlease acknowledge and follow these instructions.")]
            ),
            types.Content(
                role="model",
                parts=[types.Part(text="I understand. I am a medical AI assistant for Bisheshoggo AI. How can I help you?")]
            ),
        ]
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))

        response = client.models.generate_content(
            model=GEMMA_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(temperature=0.3, max_output_tokens=2048),
        )
        return {"content": response.text, "model": GEMMA_MODEL}
    except Exception as e2:
        print(f"[AI] Gemma API fallback also failed: {e2}")
        raise


async def ai_symptom_analysis(symptoms: list, severity: str, duration: str, additional_notes: str = ""):
    """Evidence-based symptom analysis and triage. Groq primary, Gemma fallback."""
    symptoms_text = ", ".join(symptoms)

    prompt = f"""Analyze the following patient symptoms and provide a structured medical assessment.

PATIENT SYMPTOMS: {symptoms_text}
SEVERITY: {severity}
DURATION: {duration}
ADDITIONAL NOTES: {additional_notes or "None provided"}

CONTEXT: Patient is in rural Bangladesh with limited healthcare access.

Provide your analysis in the following JSON format:
{{
    "diagnosis": "Most likely condition name",
    "suggested_conditions": ["Condition 1", "Condition 2", "Condition 3"],
    "recommendations": "Detailed recommendations in both English and Bengali",
    "urgency_level": "emergency|high|moderate|low",
    "home_remedies": ["Remedy 1", "Remedy 2"],
    "warning_signs": ["Warning 1", "Warning 2"],
    "should_see_doctor": true/false,
    "triage_reasoning": "Brief clinical reasoning for the triage level",
    "follow_up": "When to follow up or seek further care"
}}

Be thorough but practical. Consider common conditions in Bangladesh (tropical diseases, waterborne illnesses, nutritional deficiencies).
Respond ONLY with the JSON object, no additional text."""

    # ── Try Groq (primary) ──
    try:
        client = _get_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a medical AI triage assistant. Respond only with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        response_text = response.choices[0].message.content
        model_used = GROQ_MODEL
    except Exception as e:
        print(f"[AI] Groq symptom analysis failed ({e}), falling back to Gemma API...")
        # ── Gemma API fallback ──
        try:
            from google.genai import types
            client = _get_gemma_fallback_client()
            full_prompt = "[System: You are a medical AI triage assistant. Respond only with valid JSON.]\n\n" + prompt
            response = client.models.generate_content(
                model=GEMMA_MODEL,
                contents=[types.Content(role="user", parts=[types.Part(text=full_prompt)])],
                config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=2048),
            )
            response_text = response.text
            model_used = GEMMA_MODEL
        except Exception as e2:
            print(f"[AI] Gemma API fallback also failed: {e2}")
            raise

    # Parse JSON response
    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text[:-3].strip()

    try:
        result = json.loads(response_text)
    except json.JSONDecodeError:
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "diagnosis": "Unable to parse AI response",
                "suggested_conditions": ["Please consult a healthcare professional"],
                "recommendations": response_text,
                "urgency_level": "moderate",
                "home_remedies": [],
                "warning_signs": ["If symptoms worsen, seek immediate medical care"],
                "should_see_doctor": True,
                "triage_reasoning": "AI response could not be structured",
                "follow_up": "Consult a healthcare professional as soon as possible"
            }

    result["model"] = model_used
    return result


async def ai_medicine_analysis(
    prescriptions: list,
    diagnosis: str = "",
    patient_history: str = "",
    consultation_history: str = "",
):
    """Medicine interaction checking and recommendations. Groq primary, Gemma fallback."""
    prompt = f"""As a medical AI assistant, analyze these prescribed medicines for a patient in rural Bangladesh.

PRESCRIBED MEDICINES:
{json.dumps(prescriptions, indent=2)}

DIAGNOSIS: {diagnosis or "Not specified"}
PATIENT HISTORY: {patient_history or "Not provided"}
PREVIOUS CONSULTATIONS: {consultation_history or "No previous records"}

Provide analysis in JSON format:
{{
    "suggestions": [
        {{
            "medicine": "Medicine name",
            "reason": "Why this medicine is prescribed and if it's appropriate",
            "shouldTake": "YES - Continue taking" or "NO - Not needed" or "CONSULT - Needs doctor review",
            "alternatives": ["Available alternatives in rural Bangladesh"],
            "precautions": ["Important precautions"],
            "interactions": ["Drug interactions to watch"],
            "effectiveness": "high|moderate|low"
        }}
    ],
    "overallRecommendation": "Summary guidance",
    "warnings": ["Critical warnings"],
    "interactionAlerts": ["Any dangerous drug interactions found"]
}}

Consider medicine availability and cost in rural Bangladesh. Respond ONLY with JSON."""

    # ── Try Groq (primary) ──
    try:
        client = _get_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a medical pharmacology AI. Respond only with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        response_text = response.choices[0].message.content
        model_used = GROQ_MODEL
    except Exception as e:
        print(f"[AI] Groq medicine analysis failed ({e}), falling back to Gemma API...")
        # ── Gemma API fallback ──
        try:
            from google.genai import types
            client = _get_gemma_fallback_client()
            full_prompt = "[System: You are a medical pharmacology AI. Respond only with valid JSON.]\n\n" + prompt
            response = client.models.generate_content(
                model=GEMMA_MODEL,
                contents=[types.Content(role="user", parts=[types.Part(text=full_prompt)])],
                config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=2048),
            )
            response_text = response.text
            model_used = GEMMA_MODEL
        except Exception as e2:
            print(f"[AI] Gemma API fallback also failed: {e2}")
            raise

    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text[:-3].strip()

    try:
        result = json.loads(response_text)
    except json.JSONDecodeError:
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "suggestions": [],
                "overallRecommendation": "Unable to analyze. Please consult a healthcare professional.",
                "warnings": ["AI analysis unavailable. Seek professional medical advice."]
            }

    result["model"] = model_used
    return result
