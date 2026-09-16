"use client"

export type RiskLevel = "low" | "medium" | "high" | "emergency"

export interface SymptomInput {
  symptoms: string[]
  duration: string
  severity: number
  age: number
  temperature?: number
  hasChronicConditions: boolean
  isPregnant?: boolean
  additionalInfo?: string
}

export interface TriageResult {
  riskLevel: RiskLevel
  urgency: string
  urgencyBn: string
  recommendation: string
  recommendationBn: string
  reasons: string[]
  reasonsBn: string[]
  advice: string[]
  adviceBn: string[]
  warningSigns: string[]
  warningSignsBn: string[]
  shouldSeekImmediate: boolean
}

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "difficulty breathing",
  "unconscious",
  "severe bleeding",
  "snake bite",
  "poisoning",
  "stroke",
  "heart attack",
  "severe burn",
  "head injury",
  "বুকে ব্যথা",
  "শ্বাসকষ্ট",
  "অজ্ঞান",
  "রক্তপাত",
  "সাপে কাটা",
  "বিষক্রিয়া",
]

const HIGH_RISK_KEYWORDS = [
  "high fever",
  "persistent vomiting",
  "severe pain",
  "confusion",
  "seizure",
  "blood in stool",
  "blood in urine",
  "severe headache",
  "তীব্র জ্বর",
  "বমি",
  "তীব্র ব্যথা",
  "খিঁচুনি",
  "মাথাব্যথা",
]

const MEDIUM_RISK_KEYWORDS = [
  "fever",
  "cough",
  "diarrhea",
  "nausea",
  "rash",
  "joint pain",
  "fatigue",
  "headache",
  "জ্বর",
  "কাশি",
  "ডায়রিয়া",
  "ফুসকুড়ি",
  "ক্লান্তি",
]

export class TriageEngine {
  assess(input: SymptomInput): TriageResult {
    const symptomsText = input.symptoms.join(" ").toLowerCase()
    const additionalText = (input.additionalInfo || "").toLowerCase()
    const allText = `${symptomsText} ${additionalText}`

    // Emergency detection
    if (this.hasEmergencySymptoms(allText, input)) {
      return this.createEmergencyResult(input, allText)
    }

    // High risk detection
    if (this.hasHighRiskSymptoms(allText, input)) {
      return this.createHighRiskResult(input, allText)
    }

    // Medium risk detection
    if (this.hasMediumRiskSymptoms(allText, input)) {
      return this.createMediumRiskResult(input, allText)
    }

    // Low risk
    return this.createLowRiskResult(input, allText)
  }

  private hasEmergencySymptoms(text: string, input: SymptomInput): boolean {
    const hasEmergencyKeyword = EMERGENCY_KEYWORDS.some((keyword) => text.includes(keyword))
    const hasCriticalVitals = !!(input.temperature && input.temperature > 104)
    const isHighSeverity = input.severity >= 9
    const isPregnantWithSevereSymptoms = !!(input.isPregnant && input.severity >= 7)

    return hasEmergencyKeyword || hasCriticalVitals || isHighSeverity || isPregnantWithSevereSymptoms
  }

  private hasHighRiskSymptoms(text: string, input: SymptomInput): boolean {
    const hasHighRiskKeyword = HIGH_RISK_KEYWORDS.some((keyword) => text.includes(keyword))
    const hasHighFever = input.temperature && input.temperature > 102
    const isHighSeverityWithDuration = input.severity >= 7 && input.duration === "more-than-week"
    const hasChronicWithModerate = input.hasChronicConditions && input.severity >= 6

    return hasHighRiskKeyword || hasHighFever || isHighSeverityWithDuration || hasChronicWithModerate
  }

  private hasMediumRiskSymptoms(text: string, input: SymptomInput): boolean {
    const hasMediumRiskKeyword = MEDIUM_RISK_KEYWORDS.some((keyword) => text.includes(keyword))
    const hasModerateFever = input.temperature && input.temperature > 100 && input.temperature <= 102
    const isModerateSeverity = input.severity >= 5 && input.severity < 7

    return hasMediumRiskKeyword || hasModerateFever || isModerateSeverity
  }

  private createEmergencyResult(input: SymptomInput, text: string): TriageResult {
    const reasons: string[] = []
    const reasonsBn: string[] = []

    if (text.includes("chest pain") || text.includes("বুকে ব্যথা")) {
      reasons.push("Chest pain detected - possible cardiac emergency")
      reasonsBn.push("বুকে ব্যথা সনাক্ত - হৃদরোগের জরুরি অবস্থা সম্ভব")
    }
    if (text.includes("difficulty breathing") || text.includes("শ্বাসকষ্ট")) {
      reasons.push("Severe breathing difficulty")
      reasonsBn.push("তীব্র শ্বাসকষ্ট")
    }
    if (input.severity >= 9) {
      reasons.push("Extremely high pain/severity level")
      reasonsBn.push("অত্যন্ত উচ্চ ব্যথা/তীব্রতা স্তর")
    }
    if (input.temperature && input.temperature > 104) {
      reasons.push("Dangerously high fever")
      reasonsBn.push("বিপজ্জনক উচ্চ জ্বর")
    }

    return {
      riskLevel: "emergency",
      urgency: "IMMEDIATE EMERGENCY",
      urgencyBn: "জরুরি জরুরি",
      recommendation: "Call emergency services NOW or go to nearest hospital immediately",
      recommendationBn: "এখনই জরুরি সেবায় কল করুন বা অবিলম্বে নিকটতম হাসপাতালে যান",
      reasons,
      reasonsBn,
      advice: [
        "Do NOT wait",
        "Call emergency hotline: 999",
        "Have someone accompany you",
        "Bring any medications you're taking",
      ],
      adviceBn: ["অপেক্ষা করবেন না", "জরুরি হটলাইনে কল করুন: ৯৯৯", "কাউকে সাথে নিন", "আপনার ওষুধ সাথে নিন"],
      warningSigns: ["Loss of consciousness", "Severe chest pain", "Difficulty breathing", "Uncontrolled bleeding"],
      warningSignsBn: ["অজ্ঞান হওয়া", "তীব্র বুকে ব্যথা", "শ্বাসকষ্ট", "অনিয়ন্ত্রিত রক্তপাত"],
      shouldSeekImmediate: true,
    }
  }

  private createHighRiskResult(input: SymptomInput, text: string): TriageResult {
    const reasons: string[] = []
    const reasonsBn: string[] = []

    if (input.temperature && input.temperature > 102) {
      reasons.push("High fever above 102°F")
      reasonsBn.push("১০২°ফা এর উপরে উচ্চ জ্বর")
    }
    if (input.severity >= 7) {
      reasons.push("High symptom severity")
      reasonsBn.push("উচ্চ লক্ষণ তীব্রতা")
    }
    if (input.hasChronicConditions) {
      reasons.push("Pre-existing chronic condition")
      reasonsBn.push("পূর্ব-বিদ্যমান দীর্ঘমেয়াদী অবস্থা")
    }

    return {
      riskLevel: "high",
      urgency: "URGENT - Seek medical care within 24 hours",
      urgencyBn: "জরুরি - ২৪ ঘণ্টার মধ্যে চিকিৎসা নিন",
      recommendation: "Visit a doctor or healthcare facility within 24 hours",
      recommendationBn: "২৪ ঘণ্টার মধ্যে ডাক্তার বা স্বাস্থ্য কেন্দ্রে যান",
      reasons,
      reasonsBn,
      advice: [
        "Monitor symptoms closely",
        "Keep track of temperature",
        "Stay hydrated",
        "Rest adequately",
        "Contact local health worker",
      ],
      adviceBn: [
        "লক্ষণ নিবিড়ভাবে পর্যবেক্ষণ করুন",
        "তাপমাত্রা নোট রাখুন",
        "প্রচুর পানি পান করুন",
        "পর্যাপ্ত বিশ্রাম নিন",
        "স্থানীয় স্বাস্থ্যকর্মীর সাথে যোগাযোগ করুন",
      ],
      warningSigns: [
        "Symptoms worsen rapidly",
        "Fever increases above 103°F",
        "New severe symptoms appear",
        "Unable to keep fluids down",
      ],
      warningSignsBn: ["লক্ষণ দ্রুত খারাপ হয়", "জ্বর ১০৩°ফা এর উপরে বৃদ্ধি পায়", "নতুন তীব্র লক্ষণ দেখা দেয়", "তরল খাবার খেতে পারছেন না"],
      shouldSeekImmediate: false,
    }
  }

  private createMediumRiskResult(input: SymptomInput, text: string): TriageResult {
    const reasons: string[] = []
    const reasonsBn: string[] = []

    if (input.temperature && input.temperature > 100) {
      reasons.push("Moderate fever")
      reasonsBn.push("মধ্যম জ্বর")
    }
    if (input.severity >= 5) {
      reasons.push("Moderate symptom severity")
      reasonsBn.push("মধ্যম লক্ষণ তীব্রতা")
    }
    if (input.duration === "more-than-week") {
      reasons.push("Symptoms persisting for over a week")
      reasonsBn.push("এক সপ্তাহেরও বেশি সময় ধরে লক্ষণ")
    }

    return {
      riskLevel: "medium",
      urgency: "See a doctor within 2-3 days",
      urgencyBn: "২-৩ দিনের মধ্যে ডাক্তার দেখান",
      recommendation: "Schedule a medical consultation soon. Symptoms should be evaluated.",
      recommendationBn: "শীঘ্রই চিকিৎসা পরামর্শ নিন। লক্ষণগুলি মূল্যায়ন করা উচিত।",
      reasons,
      reasonsBn,
      advice: [
        "Monitor symptoms daily",
        "Stay well hydrated",
        "Get adequate rest",
        "Avoid strenuous activities",
        "Keep a symptom diary",
      ],
      adviceBn: [
        "প্রতিদিন লক্ষণ পর্যবেক্ষণ করুন",
        "ভালভাবে হাইড্রেটেড থাকুন",
        "পর্যাপ্ত বিশ্রাম নিন",
        "কঠিন কাজ এড়িয়ে চলুন",
        "লক্ষণ ডায়েরি রাখুন",
      ],
      warningSigns: ["Symptoms suddenly worsen", "Fever develops", "Severe pain begins", "New concerning symptoms"],
      warningSignsBn: ["লক্ষণ হঠাৎ খারাপ হয়", "জ্বর হয়", "তীব্র ব্যথা শুরু হয়", "নতুন উদ্বেগজনক লক্ষণ"],
      shouldSeekImmediate: false,
    }
  }

  private createLowRiskResult(input: SymptomInput, text: string): TriageResult {
    return {
      riskLevel: "low",
      urgency: "Monitor and self-care",
      urgencyBn: "পর্যবেক্ষণ ও স্ব-পরিচর্যা",
      recommendation: "These symptoms are likely minor. Monitor and practice self-care. See a doctor if worsens.",
      recommendationBn: "এই লক্ষণগুলি সম্ভবত ছোটখাটো। পর্যবেক্ষণ করুন এবং স্ব-পরিচর্যা অনুশীলন করুন। খারাপ হলে ডাক্তার দেখান।",
      reasons: ["Low severity symptoms", "No emergency indicators", "Manageable with home care"],
      reasonsBn: ["কম তীব্রতার লক্ষণ", "কোন জরুরি ইঙ্গিত নেই", "ঘরোয়া যত্নে পরিচালনাযোগ্য"],
      advice: [
        "Rest and stay hydrated",
        "Take over-the-counter medications if needed",
        "Maintain good hygiene",
        "Eat nutritious foods",
        "Monitor for any changes",
      ],
      adviceBn: [
        "বিশ্রাম নিন এবং হাইড্রেটেড থাকুন",
        "প্রয়োজনে ওভার-দ্য-কাউন্টার ওষুধ নিন",
        "ভাল স্বাস্থ্যবিধি বজায় রাখুন",
        "পুষ্টিকর খাবার খান",
        "যেকোনো পরিবর্তনের জন্য পর্যবেক্ষণ করুন",
      ],
      warningSigns: ["Symptoms persist beyond a week", "Fever develops", "Pain increases", "New symptoms appear"],
      warningSignsBn: ["লক্ষণ এক সপ্তাহের বেশি স্থায়ী হয়", "জ্বর হয়", "ব্যথা বৃদ্ধি পায়", "নতুন লক্ষণ দেখা দেয়"],
      shouldSeekImmediate: false,
    }
  }

  explainRiskLevel(riskLevel: RiskLevel, language: "en" | "bn" = "en"): string {
    const explanations = {
      en: {
        emergency:
          "This is a life-threatening emergency requiring immediate medical attention. Do not delay seeking help.",
        high: "Your symptoms indicate a potentially serious condition that requires medical evaluation within 24 hours.",
        medium: "Your symptoms warrant medical attention soon. Schedule a doctor visit within 2-3 days.",
        low: "Your symptoms appear manageable with self-care. Monitor closely and seek help if they worsen.",
      },
      bn: {
        emergency: "এটি একটি জীবন-হুমকির জরুরী অবস্থা যা অবিলম্বে চিকিৎসা মনোযোগ প্রয়োজন। সাহায্য নিতে বিলম্ব করবেন না।",
        high: "আপনার লক্ষণগুলি একটি সম্ভাব্য গুরুতর অবস্থা নির্দেশ করে যার জন্য ২৪ ঘন্টার মধ্যে চিকিৎসা মূল্যায়ন প্রয়োজন।",
        medium: "আপনার লক্ষণগুলি শীঘ্রই চিকিৎসা মনোযোগ নিশ্চিত করে। ২-৩ দিনের মধ্যে ডাক্তার ভিজিট নির্ধারণ করুন।",
        low: "আপনার লক্ষণগুলি স্ব-যত্নের সাথে পরিচালনযোগ্য বলে মনে হচ্ছে। নিবিড়ভাবে পর্যবেক্ষণ করুন এবং খারাপ হলে সাহায্য নিন।",
      },
    }

    return explanations[language][riskLevel]
  }
}

export const triageEngine = new TriageEngine()
