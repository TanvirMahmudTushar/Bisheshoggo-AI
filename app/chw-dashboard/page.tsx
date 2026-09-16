"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Users,
  AlertTriangle,
  Activity,
  CheckCircle,
  Search,
  Phone,
  MapPin,
  Clock,
  Volume2,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import { offlineStorage } from "@/lib/offline/storage"
import { motion } from "framer-motion"
import Link from "next/link"
import { OfflineIndicator, ConnectionStatus } from "@/components/offline-indicator"

interface PatientCase {
  id: string
  patientName: string
  age: number
  riskLevel: "low" | "medium" | "high" | "emergency"
  symptoms: string[]
  location: string
  timestamp: string
  hasVoiceMessage?: boolean
  phone?: string
}

export default function CHWDashboardPage() {
  const [language, setLanguage] = useState<"en" | "bn">("en")
  const [searchQuery, setSearchQuery] = useState("")
  const [patients, setPatients] = useState<PatientCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    setLoading(true)
    const cases: PatientCase[] = []

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('bisheshoggo_token') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const [symptomResponse, emergencyResponse] = await Promise.all([
        fetch(`${apiUrl}/symptom-check`, { headers }),
        fetch(`${apiUrl}/emergency`, { headers }),
      ])

      if (symptomResponse.ok) {
        const symptomData = await symptomResponse.json()
        symptomData.data?.forEach((check: any) => {
          const symptomsArray = Array.isArray(check.symptoms) ? check.symptoms : []
          cases.push({
            id: check.id,
            patientName: "Patient " + check.id.slice(-4),
            age: 0, // Age not available in symptom_checks table
            riskLevel: getSeverityLevel(check.severity || 5),
            symptoms: symptomsArray,
            location: "Unknown",
            timestamp: check.created_at,
            hasVoiceMessage: false,
          })
        })
      }

      if (emergencyResponse.ok) {
        const emergencyData = await emergencyResponse.json()
        emergencyData.data?.forEach((emergency: any) => {
          const patient = emergency.patient
          cases.push({
            id: emergency.id,
            patientName: patient?.full_name || "Unknown Patient",
            age: 0, // Age not in profiles table
            riskLevel: "emergency",
            symptoms: emergency.description?.split(", ") || [emergency.emergency_type || "Emergency"],
            location: emergency.location_address || "Unknown",
            timestamp: emergency.created_at,
            hasVoiceMessage: false,
            phone: patient?.phone || undefined,
          })
        })
      }

      console.log("[ ] Loaded cases from database:", cases.length)
    } catch (error) {
      console.log("[ ] Database fetch failed, loading from offline storage:", error)
    }

    const symptomChecks = offlineStorage.getAll("symptom_check_")
    const emergencies = offlineStorage.getAll("emergency_")

    symptomChecks.forEach((check: any) => {
      if (!cases.find((c) => c.id === check.id)) {
        cases.push({
          id: check.id,
          patientName: "Patient " + check.id.slice(-4),
          age: check.input?.age || 0,
          riskLevel: check.result?.riskLevel || "low",
          symptoms: check.input?.symptoms || [],
          location: "Unknown",
          timestamp: check.date,
          hasVoiceMessage: false,
        })
      }
    })

    emergencies.forEach((emergency: any) => {
      if (!cases.find((c) => c.id === emergency.id)) {
        cases.push({
          id: emergency.id,
          patientName: emergency.data?.patientName || "Unknown",
          age: emergency.data?.age || 0,
          riskLevel: "emergency",
          symptoms: emergency.data?.symptoms || [],
          location: emergency.data?.location || "Unknown",
          timestamp: emergency.timestamp,
          hasVoiceMessage: false,
        })
      }
    })

    cases.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setPatients(cases)
    setLoading(false)
  }

  const getSeverityLevel = (severity: number): "low" | "medium" | "high" | "emergency" => {
    if (severity >= 9) return "emergency"
    if (severity >= 7) return "high"
    if (severity >= 4) return "medium"
    return "low"
  }

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, { label: string; labelBn: string; className: string }> = {
      emergency: { label: "EMERGENCY", labelBn: "জরুরি", className: "bg-red-500 text-white" },
      high: { label: "HIGH", labelBn: "উচ্চ", className: "bg-orange-500 text-white" },
      medium: { label: "MEDIUM", labelBn: "মধ্যম", className: "bg-yellow-500 text-white" },
      low: { label: "LOW", labelBn: "নিম্ন", className: "bg-emerald-500 text-white" },
    }

    const variant = variants[risk] || variants.low
    return <Badge className={variant.className}>{language === "en" ? variant.label : variant.labelBn}</Badge>
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const highRiskCount = patients.filter((p) => p.riskLevel === "high" || p.riskLevel === "emergency").length
  const totalCases = patients.length

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <OfflineIndicator />
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {language === "en" ? "CHW Dashboard" : "সিএইচডব্লিউ ড্যাশবোর্ড"}
                </h1>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <ConnectionStatus />
                  <span>{language === "en" ? "Community Health Worker Portal" : "কমিউনিটি স্বাস্থ্যকর্মী পোর্টাল"}</span>
                </div>
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

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Users,
                label: language === "en" ? "Total Cases" : "মোট কেস",
                value: totalCases,
                color: "text-blue-500",
                bgColor: "bg-blue-500/10",
              },
              {
                icon: AlertTriangle,
                label: language === "en" ? "High Risk" : "উচ্চ ঝুঁকি",
                value: highRiskCount,
                color: "text-red-500",
                bgColor: "bg-red-500/10",
              },
              {
                icon: CheckCircle,
                label: language === "en" ? "Resolved" : "সমাধান",
                value: 0,
                color: "text-emerald-500",
                bgColor: "bg-emerald-500/10",
              },
              {
                icon: Activity,
                label: language === "en" ? "Active" : "সক্রিয়",
                value: totalCases,
                color: "text-amber-500",
                bgColor: "bg-amber-500/10",
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder={
                    language === "en" ? "Search patients by name or location..." : "নাম বা অবস্থান দিয়ে রোগী খুঁজুন..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Patient Cases */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "en" ? "Patient Cases" : "রোগীর কেস"}</CardTitle>
              <CardDescription>
                {language === "en"
                  ? "Review and manage patient cases in your area"
                  : "আপনার এলাকায় রোগীর কেস পর্যালোচনা এবং পরিচালনা করুন"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">{language === "en" ? "All" : "সব"}</TabsTrigger>
                  <TabsTrigger value="emergency" className="text-red-500">
                    {language === "en" ? "Emergency" : "জরুরি"}
                  </TabsTrigger>
                  <TabsTrigger value="high">{language === "en" ? "High" : "উচ্চ"}</TabsTrigger>
                  <TabsTrigger value="medium">{language === "en" ? "Medium" : "মধ্যম"}</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4 mt-6">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {language === "en" ? "No cases found" : "কোন কেস পাওয়া যায়নি"}
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <PatientCaseCard key={patient.id} patient={patient} language={language} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="emergency" className="space-y-4 mt-6">
                  {filteredPatients.filter((p) => p.riskLevel === "emergency").length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {language === "en" ? "No emergency cases" : "কোন জরুরি কেস নেই"}
                    </div>
                  ) : (
                    filteredPatients
                      .filter((p) => p.riskLevel === "emergency")
                      .map((patient) => <PatientCaseCard key={patient.id} patient={patient} language={language} />)
                  )}
                </TabsContent>

                <TabsContent value="high" className="space-y-4 mt-6">
                  {filteredPatients.filter((p) => p.riskLevel === "high").length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {language === "en" ? "No high risk cases" : "কোন উচ্চ ঝুঁকির কেস নেই"}
                    </div>
                  ) : (
                    filteredPatients
                      .filter((p) => p.riskLevel === "high")
                      .map((patient) => <PatientCaseCard key={patient.id} patient={patient} language={language} />)
                  )}
                </TabsContent>

                <TabsContent value="medium" className="space-y-4 mt-6">
                  {filteredPatients.filter((p) => p.riskLevel === "medium").length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {language === "en" ? "No medium risk cases" : "কোন মধ্যম ঝুঁকির কেস নেই"}
                    </div>
                  ) : (
                    filteredPatients
                      .filter((p) => p.riskLevel === "medium")
                      .map((patient) => <PatientCaseCard key={patient.id} patient={patient} language={language} />)
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function PatientCaseCard({ patient, language }: { patient: PatientCase; language: "en" | "bn" }) {
  const getRiskBadge = (risk: string) => {
    const variants: Record<string, { label: string; labelBn: string; className: string }> = {
      emergency: { label: "EMERGENCY", labelBn: "জরুরি", className: "bg-red-500 text-white" },
      high: { label: "HIGH", labelBn: "উচ্চ", className: "bg-orange-500 text-white" },
      medium: { label: "MEDIUM", labelBn: "মধ্যম", className: "bg-yellow-500 text-white" },
      low: { label: "LOW", labelBn: "নিম্ন", className: "bg-emerald-500 text-white" },
    }

    const variant = variants[risk] || variants.low
    return <Badge className={variant.className}>{language === "en" ? variant.label : variant.labelBn}</Badge>
  }

  const handleCall = () => {
    if (patient.phone) {
      window.location.href = `tel:${patient.phone}`
    } else {
      alert(language === "en" ? "No phone number available" : "কোন ফোন নম্বর উপলব্ধ নেই")
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={patient.riskLevel === "emergency" || patient.riskLevel === "high" ? "border-red-500/50" : ""}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{patient.patientName}</h3>
                {getRiskBadge(patient.riskLevel)}
                {patient.hasVoiceMessage && <Volume2 className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === "en" ? "Age" : "বয়স"}: {patient.age} • {language === "en" ? "ID" : "আইডি"}:{" "}
                {patient.id.slice(-6)}
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2 text-sm">
              <Activity className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-muted-foreground">{language === "en" ? "Symptoms:" : "লক্ষণ:"}</span>
                <span className="ml-2">
                  {patient.symptoms.join(", ") || (language === "en" ? "None reported" : "কোনটি রিপোর্ট করা হয়নি")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{language === "en" ? "Location:" : "অবস্থান:"}</span>
              <span>{patient.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{language === "en" ? "Reported:" : "রিপোর্ট:"}</span>
              <span>{new Date(patient.timestamp).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleCall}>
              <Phone className="w-4 h-4 mr-2" />
              {language === "en" ? "Call Patient" : "রোগীকে কল করুন"}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
              {language === "en" ? "View Details" : "বিস্তারিত দেখুন"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
