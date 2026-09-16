"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Phone, MessageSquare, MapPin, Loader2, Ambulance, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  generateEmergencySMS,
  sendSMS,
  makePhoneCall,
  EMERGENCY_HOTLINES,
  type EmergencySMSData,
} from "@/lib/emergency/sms-generator"
import { offlineStorage } from "@/lib/offline/storage"
import { motion } from "framer-motion"

interface EmergencyAlertProps {
  language: "en" | "bn"
}

export function EmergencyAlert({ language }: EmergencyAlertProps) {
  const [patientName, setPatientName] = useState("")
  const [age, setAge] = useState("")
  const [emergency, setEmergency] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [location, setLocation] = useState("")
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [alertSent, setAlertSent] = useState(false)

  useEffect(() => {
    // Load saved profile data
    const profile = offlineStorage.get("user_profile")
    if (profile) {
      setPatientName(profile.name || "")
      setAge(profile.age?.toString() || "")
    }
  }, [])

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    setGettingLocation(true)
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        setGettingLocation(false)
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCoordinates(coords)
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`)
          setGettingLocation(false)
          resolve(coords)
        },
        (error) => {
          console.error("[ ] Error getting location:", error)
          setGettingLocation(false)
          resolve(null)
        },
        { timeout: 8000 },
      )
    })
  }

  const handleEmergencyAlert = async () => {
    // The backend requires coordinates to plot the alert for nearby health
    // workers - grab them now if the user hasn't already, rather than
    // silently failing to notify anyone once submitted.
    let coords = coordinates
    if (!coords) {
      coords = await getLocation()
    }

    const data: EmergencySMSData = {
      patientName: patientName || "Patient",
      age: Number.parseInt(age) || 0,
      location: location || "Unknown",
      coordinates: coords || undefined,
      emergency,
      symptoms: symptoms ? symptoms.split(",").map((s) => s.trim()) : [],
    }

    const smsText = generateEmergencySMS(data, language)

    const emergencyLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      data,
      smsText,
    }
    offlineStorage.set(`emergency_${emergencyLog.id}`, emergencyLog)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('bisheshoggo_token') : null
      const response = await fetch(`${apiUrl}/emergency`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          location: data.location,
          latitude: data.coordinates?.lat,
          longitude: data.coordinates?.lng,
          emergency_type: data.emergency,
          description: (data.symptoms ?? []).join(", "),
          status: "pending",
        }),
      })

      if (response.ok) {
        console.log("[ ] Emergency alert saved to database")
        offlineStorage.markAsSynced(`emergency_${emergencyLog.id}`)
      } else {
        // The request reached the server but was rejected (e.g. no
        // coordinates available) - queue it the same way a network
        // failure would be, instead of silently dropping it. The local
        // record and SMS text above are already saved either way.
        console.error("[ ] Emergency alert rejected by server:", response.status)
        offlineStorage.set(`pending_emergency_${emergencyLog.id}`, {
          type: "emergency",
          data: {
            location: data.location,
            latitude: data.coordinates?.lat,
            longitude: data.coordinates?.lng,
            emergency_type: data.emergency,
            description: (data.symptoms ?? []).join(", "),
            status: "pending",
          },
        })
      }
    } catch (error) {
      console.log("[ ] Offline - emergency will sync when online:", error)
      // Mark for syncing later
      offlineStorage.set(`pending_emergency_${emergencyLog.id}`, {
        type: "emergency",
        data: {
          location: data.location,
          latitude: data.coordinates?.lat,
          longitude: data.coordinates?.lng,
          emergency_type: data.emergency,
          description: (data.symptoms || []).join(", "),
          status: "pending",
        },
      })
    }

    setAlertSent(true)
    setTimeout(() => setAlertSent(false), 5000)
  }

  const quickCallEmergency = () => {
    makePhoneCall(EMERGENCY_HOTLINES.ambulance)
  }

  const sendSMSToHotline = () => {
    const data: EmergencySMSData = {
      patientName: patientName || "Patient",
      age: Number.parseInt(age) || 0,
      location: location || "Unknown",
      coordinates: coordinates || undefined,
      emergency,
      symptoms: symptoms ? symptoms.split(",").map((s) => s.trim()) : [],
    }

    const smsText = generateEmergencySMS(data, language)
    sendSMS(EMERGENCY_HOTLINES.ambulance, smsText)
  }

  return (
    <div className="space-y-6">
      {/* Quick Emergency Buttons */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            className="w-full h-24 text-xl font-bold bg-red-600 hover:bg-red-700"
            onClick={quickCallEmergency}
          >
            <Phone className="w-8 h-8 mr-3" />
            {language === "en" ? "Call 999 Now" : "৯৯৯ কল করুন"}
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            className="w-full h-24 text-xl font-bold bg-orange-600 hover:bg-orange-700"
            onClick={async () => {
              const coords = await getLocation()
              if (!coords) {
                alert(language === "en" ? "Could not get location" : "অবস্থান পেতে পারিনি")
              }
            }}
          >
            {gettingLocation ? <Loader2 className="w-8 h-8 mr-3 animate-spin" /> : <MapPin className="w-8 h-8 mr-3" />}
            {language === "en" ? "Get My Location" : "আমার অবস্থান পান"}
          </Button>
        </motion.div>
      </div>

      {alertSent && (
        <Alert className="bg-emerald-500/10 border-emerald-500">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <AlertDescription className="text-emerald-500 ml-2">
            {language === "en" ? "Emergency alert sent successfully!" : "জরুরি সতর্কতা সফলভাবে পাঠানো হয়েছে!"}
          </AlertDescription>
        </Alert>
      )}

      {/* Emergency Form */}
      <Card>
        <CardHeader>
          <CardTitle>{language === "en" ? "Emergency Details" : "জরুরি বিবরণ"}</CardTitle>
          <CardDescription>
            {language === "en"
              ? "Fill in the details to alert nearby health workers"
              : "নিকটবর্তী স্বাস্থ্যকর্মীদের সতর্ক করতে বিবরণ পূরণ করুন"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">
                {language === "en" ? "Patient Name" : "রোগীর নাম"}
              </Label>
              <Input
                id="name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder={language === "en" ? "Enter name" : "নাম লিখুন"}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age" className="text-base">
                {language === "en" ? "Age" : "বয়স"}
              </Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={language === "en" ? "Enter age" : "বয়স লিখুন"}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency" className="text-base">
              {language === "en" ? "Type of Emergency" : "জরুরি অবস্থার ধরন"}
            </Label>
            <Input
              id="emergency"
              value={emergency}
              onChange={(e) => setEmergency(e.target.value)}
              placeholder={
                language === "en" ? "e.g., Chest pain, severe injury, childbirth" : "যেমন: বুকে ব্যথা, গুরুতর আঘাত, প্রসব"
              }
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symptoms" className="text-base">
              {language === "en" ? "Symptoms (comma separated)" : "লক্ষণ (কমা দিয়ে আলাদা)"}
            </Label>
            <Textarea
              id="symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={language === "en" ? "e.g., fever, vomiting, unconscious" : "যেমন: জ্বর, বমি, অজ্ঞান"}
              rows={3}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-base">
              {language === "en" ? "Location" : "অবস্থান"}
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={language === "en" ? "Describe your location" : "আপনার অবস্থান বর্ণনা করুন"}
              className="h-12 text-base"
            />
            {coordinates && (
              <p className="text-sm text-muted-foreground">
                {language === "en" ? "GPS:" : "জিপিএস:"} {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="flex-1 h-12" onClick={handleEmergencyAlert}>
              <Ambulance className="w-5 h-5 mr-2" />
              {language === "en" ? "Alert Health Workers" : "স্বাস্থ্যকর্মীদের সতর্ক করুন"}
            </Button>
            <Button size="lg" variant="outline" className="flex-1 h-12 bg-transparent" onClick={sendSMSToHotline}>
              <MessageSquare className="w-5 h-5 mr-2" />
              {language === "en" ? "Send SMS" : "এসএমএস পাঠান"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Hotlines */}
      <Card>
        <CardHeader>
          <CardTitle>{language === "en" ? "Emergency Hotlines" : "জরুরি হটলাইন"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: language === "en" ? "National Emergency (Ambulance)" : "জাতীয় জরুরি (অ্যাম্বুলেন্স)", number: "999" },
              { label: language === "en" ? "Women & Children Helpline" : "নারী ও শিশু হেল্পলাইন", number: "109" },
            ].map((hotline, index) => (
              <Button
                key={index}
                variant="outline"
                size="lg"
                className="w-full h-14 justify-between text-base bg-muted"
                onClick={() => makePhoneCall(hotline.number)}
              >
                <span className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  {hotline.label}
                </span>
                <span className="font-bold">{hotline.number}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
