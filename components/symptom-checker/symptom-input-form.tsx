"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { triageEngine, type SymptomInput, type TriageResult } from "@/lib/ai/triage-engine"
import { offlineStorage } from "@/lib/offline/storage"
import { Thermometer, Clock, AlertCircle, User } from "lucide-react"
import { VoiceInputButton } from "@/components/voice/voice-input-button"
import { TextToSpeech } from "@/lib/voice/speech-recognition"

interface SymptomInputFormProps {
  onResult: (result: TriageResult) => void
  language: "en" | "bn"
}

const COMMON_SYMPTOMS_EN = [
  "Fever",
  "Cough",
  "Headache",
  "Body ache",
  "Diarrhea",
  "Vomiting",
  "Difficulty breathing",
  "Chest pain",
  "Abdominal pain",
  "Dizziness",
  "Rash",
  "Sore throat",
]

const COMMON_SYMPTOMS_BN = [
  "জ্বর",
  "কাশি",
  "মাথাব্যথা",
  "শরীর ব্যথা",
  "ডায়রিয়া",
  "বমি",
  "শ্বাসকষ্ট",
  "বুকে ব্যথা",
  "পেট ব্যথা",
  "মাথা ঘোরা",
  "ফুসকুড়ি",
  "গলা ব্যথা",
]

export function SymptomInputForm({ onResult, language }: SymptomInputFormProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [customSymptom, setCustomSymptom] = useState("")
  const [duration, setDuration] = useState("1-3-days")
  const [severity, setSeverity] = useState([5])
  const [age, setAge] = useState("")
  const [temperature, setTemperature] = useState("")
  const [hasChronicConditions, setHasChronicConditions] = useState(false)
  const [isPregnant, setIsPregnant] = useState(false)
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [tts] = useState(() => new TextToSpeech(language))

  useEffect(() => {
    tts.setLanguage(language)
  }, [language, tts])

  const symptomsList = language === "en" ? COMMON_SYMPTOMS_EN : COMMON_SYMPTOMS_BN

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => (prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]))
  }

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
      setSelectedSymptoms((prev) => [...prev, customSymptom.trim()])
      setCustomSymptom("")
    }
  }

  const handleVoiceTranscript = (transcript: string) => {
    setCustomSymptom(transcript)
    if (transcript.trim()) {
      setTimeout(() => addCustomSymptom(), 100)
    }
  }

  const playPrompt = (text: string) => {
    tts.speak(text)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const input: SymptomInput = {
      symptoms: selectedSymptoms,
      duration,
      severity: severity[0],
      age: Number.parseInt(age) || 30,
      temperature: temperature ? Number.parseFloat(temperature) : undefined,
      hasChronicConditions,
      isPregnant,
      additionalInfo,
    }

    const result = triageEngine.assess(input)

    const caseLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      input,
      result,
    }
    offlineStorage.set(`symptom_check_${caseLog.id}`, caseLog)

    try {
      const diagnosis = language === "en" ? result.recommendation : result.recommendationBn
      const recommendations = language === "en" ? result.advice.join(" | ") : result.adviceBn.join(" | ")

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('bisheshoggo_token') : null
      const response = await fetch(`${apiUrl}/symptom-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          symptoms: selectedSymptoms.join(", "),
          severity: severity[0],
          duration,
          age: Number.parseInt(age) || 30,
          gender: "not_specified",
          diagnosis,
          recommendations,
        }),
      })

      if (response.ok) {
        console.log("[ ] Symptom check saved to database")
        offlineStorage.markAsSynced(`symptom_check_${caseLog.id}`)
      }
    } catch (error) {
      console.log("[ ] Offline - will sync when online:", error)
      const diagnosis = language === "en" ? result.recommendation : result.recommendationBn
      const recommendations = language === "en" ? result.advice.join(" | ") : result.adviceBn.join(" | ")

      offlineStorage.set(`pending_symptom_${caseLog.id}`, {
        type: "symptom_check",
        data: {
          symptoms: selectedSymptoms.join(", "),
          severity: severity[0],
          duration,
          age: Number.parseInt(age) || 30,
          gender: "not_specified",
          diagnosis,
          recommendations,
        },
      })
    }

    onResult(result)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Common Symptoms */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">
            {language === "en" ? "Select your symptoms:" : "আপনার লক্ষণ নির্বাচন করুন:"}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              playPrompt(
                language === "en"
                  ? "Please select the symptoms you are experiencing"
                  : "আপনি যে লক্ষণগুলি অনুভব করছেন তা নির্বাচন করুন",
              )
            }
          >
            🔊 {language === "en" ? "Listen" : "শুনুন"}
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {symptomsList.map((symptom) => (
            <Button
              key={symptom}
              type="button"
              variant={selectedSymptoms.includes(symptom) ? "default" : "outline"}
              className="h-16 text-base font-medium"
              onClick={() => toggleSymptom(symptom)}
            >
              {symptom}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Symptom */}
      <div className="space-y-2">
        <Label htmlFor="custom-symptom" className="text-base">
          {language === "en" ? "Other symptoms:" : "অন্যান্য লক্ষণ:"}
        </Label>
        <div className="flex gap-2">
          <Input
            id="custom-symptom"
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
            placeholder={language === "en" ? "Type or speak other symptoms..." : "অন্যান্য লক্ষণ টাইপ বা বলুন..."}
            className="text-base h-12"
          />
          <VoiceInputButton onTranscript={handleVoiceTranscript} language={language} />
          <Button type="button" onClick={addCustomSymptom} size="lg">
            {language === "en" ? "Add" : "যোগ করুন"}
          </Button>
        </div>
        {selectedSymptoms.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedSymptoms.map((symptom) => (
              <div
                key={symptom}
                className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
              >
                {symptom}
                <button type="button" onClick={() => toggleSymptom(symptom)} className="hover:text-primary/70">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {language === "en" ? "How long have you had these symptoms?" : "আপনার এই লক্ষণগুলি কতদিন ধরে আছে?"}
        </Label>
        <RadioGroup value={duration} onValueChange={setDuration} className="space-y-3">
          <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
            <RadioGroupItem value="less-than-day" id="less-than-day" />
            <Label htmlFor="less-than-day" className="text-base font-normal cursor-pointer flex-1">
              {language === "en" ? "Less than 1 day" : "১ দিনের কম"}
            </Label>
          </div>
          <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
            <RadioGroupItem value="1-3-days" id="1-3-days" />
            <Label htmlFor="1-3-days" className="text-base font-normal cursor-pointer flex-1">
              {language === "en" ? "1-3 days" : "১-৩ দিন"}
            </Label>
          </div>
          <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
            <RadioGroupItem value="4-7-days" id="4-7-days" />
            <Label htmlFor="4-7-days" className="text-base font-normal cursor-pointer flex-1">
              {language === "en" ? "4-7 days" : "৪-৭ দিন"}
            </Label>
          </div>
          <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
            <RadioGroupItem value="more-than-week" id="more-than-week" />
            <Label htmlFor="more-than-week" className="text-base font-normal cursor-pointer flex-1">
              {language === "en" ? "More than a week" : "এক সপ্তাহের বেশি"}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Severity */}
      <div className="space-y-4">
        <Label className="text-base flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {language === "en" ? "How severe are your symptoms?" : "আপনার লক্ষণগুলি কতটা তীব্র?"}
        </Label>
        <div className="space-y-3">
          <Slider value={severity} onValueChange={setSeverity} max={10} min={1} step={1} className="py-4" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{language === "en" ? "Mild" : "হালকা"} (1)</span>
            <span className="text-lg font-bold text-primary">{severity[0]}</span>
            <span className="text-muted-foreground">{language === "en" ? "Severe" : "তীব্র"} (10)</span>
          </div>
        </div>
      </div>

      {/* Age and Temperature */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="age" className="text-base flex items-center gap-2">
            <User className="w-5 h-5" />
            {language === "en" ? "Age" : "বয়স"}
          </Label>
          <Input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder={language === "en" ? "Enter your age" : "আপনার বয়স লিখুন"}
            className="text-base h-12"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperature" className="text-base flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            {language === "en" ? "Temperature (°F)" : "তাপমাত্রা (°ফা)"}
          </Label>
          <Input
            id="temperature"
            type="number"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder={language === "en" ? "Optional" : "ঐচ্ছিক"}
            className="text-base h-12"
          />
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3 bg-muted p-4 rounded-lg">
          <Checkbox
            id="chronic"
            checked={hasChronicConditions}
            onCheckedChange={(checked) => setHasChronicConditions(checked as boolean)}
            className="mt-1"
          />
          <Label htmlFor="chronic" className="text-base font-normal cursor-pointer flex-1">
            {language === "en"
              ? "I have chronic health conditions (diabetes, heart disease, etc.)"
              : "আমার দীর্ঘমেয়াদী স্বাস্থ্য সমস্যা আছে (ডায়াবেটিস, হৃদরোগ ইত্যাদি)"}
          </Label>
        </div>
        <div className="flex items-start space-x-3 bg-muted p-4 rounded-lg">
          <Checkbox
            id="pregnant"
            checked={isPregnant}
            onCheckedChange={(checked) => setIsPregnant(checked as boolean)}
            className="mt-1"
          />
          <Label htmlFor="pregnant" className="text-base font-normal cursor-pointer flex-1">
            {language === "en" ? "I am pregnant" : "আমি গর্ভবতী"}
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional" className="text-base">
          {language === "en" ? "Any other information:" : "অন্য কোন তথ্য:"}
        </Label>
        <Textarea
          id="additional"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder={language === "en" ? "Describe anything else relevant..." : "অন্য প্রাসঙ্গিক কিছু বর্ণনা করুন..."}
          rows={4}
          className="text-base"
        />
      </div>

      <Button type="submit" size="lg" className="w-full text-lg h-14 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" disabled={selectedSymptoms.length === 0}>
        <span className="mr-2">🩺</span>
        {language === "en" ? "Get Offline Dr Assessment" : "অফলাইন ডাক্তারের মূল্যায়ন পান"}
      </Button>
    </form>
  )
}
