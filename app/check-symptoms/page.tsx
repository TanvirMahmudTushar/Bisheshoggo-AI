"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Stethoscope } from "lucide-react"
import Link from "next/link"
import { SymptomInputForm } from "@/components/symptom-checker/symptom-input-form"
import { TriageResults } from "@/components/symptom-checker/triage-results"
import type { TriageResult } from "@/lib/ai/triage-engine"
import { OfflineIndicator } from "@/components/offline-indicator"

export default function CheckSymptomsPage() {
  const [result, setResult] = useState<TriageResult | null>(null)
  const [language, setLanguage] = useState<"en" | "bn">("en")

  return (
    <>
      <OfflineIndicator />
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <span className="text-3xl">🩺</span>
                {language === "en" ? "Offline Dr" : "অফলাইন ডাক্তার"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === "en" ? "100% Offline AI Medical Assistant • No Internet Required" : "১০০% অফলাইন AI মেডিকেল সহকারী • ইন্টারনেট প্রয়োজন নেই"}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-xs text-green-700 dark:text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {language === "en" ? "Works Fully Offline" : "সম্পূর্ণ অফলাইনে কাজ করে"}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLanguage(language === "en" ? "bn" : "en")}
              className="font-semibold"
            >
              {language === "en" ? "বাংলা" : "English"}
            </Button>
          </div>

          {!result ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>💬</span>
                  {language === "en" ? "Tell Offline Dr Your Symptoms" : "অফলাইন ডাক্তারকে আপনার লক্ষণ বলুন"}
                </CardTitle>
                <CardDescription>
                  {language === "en"
                    ? "Your local AI doctor will analyze and provide instant recommendations - no internet needed!"
                    : "আপনার লোকাল AI ডাক্তার বিশ্লেষণ করবেন এবং তাত্ক্ষণিক পরামর্শ দেবেন - ইন্টারনেট দরকার নেই!"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SymptomInputForm onResult={setResult} language={language} />
              </CardContent>
            </Card>
          ) : (
            <TriageResults result={result} language={language} onReset={() => setResult(null)} />
          )}
        </div>
      </div>
    </>
  )
}
