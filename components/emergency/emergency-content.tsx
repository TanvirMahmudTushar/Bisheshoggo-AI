"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Ambulance, AlertCircle, MapPin, Phone, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { emergencyApi } from "@/lib/api/client"
import { toast } from "sonner"
import { motion } from "framer-motion"
import type { Profile, PatientProfile, EmergencySOS } from "@/lib/types"

interface EmergencyContentProps {
  userId: string
  profile: Profile | null
  patientProfile: PatientProfile | null
  activeEmergencies: EmergencySOS[]
}

export function EmergencyContent({ userId, profile, patientProfile, activeEmergencies }: EmergencyContentProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationAddress, setLocationAddress] = useState<string>("")
  const [emergencyType, setEmergencyType] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasActiveEmergency, setHasActiveEmergency] = useState(activeEmergencies.length > 0)

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          // Try to get address from coordinates
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
          )
            .then((res) => res.json())
            .then((data) => {
              if (data.display_name) {
                setLocationAddress(data.display_name)
              }
            })
            .catch(() => {
              setLocationAddress(
                `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`,
              )
            })
        },
        (error) => {
          console.error("[ ] Geolocation error:", error)
          toast.error("Unable to get your location. Please enable location services.")
        },
      )
    }
  }, [])

  const handleEmergencySOS = async () => {
    if (!location) {
      toast.error("Location is required for emergency SOS")
      return
    }

    if (!emergencyType) {
      toast.error("Please select emergency type")
      return
    }

    setIsLoading(true)

    try {
      await emergencyApi.create({
        latitude: location.lat,
        longitude: location.lng,
        location: locationAddress || undefined,
        emergency_type: emergencyType,
        description: description || undefined,
      })

      toast.success("Emergency SOS sent! Help is on the way.")
      setHasActiveEmergency(true)

      // Reset form
      setEmergencyType("")
      setDescription("")
    } catch (error) {
      console.error("[ ] Error sending emergency SOS:", error)
      toast.error("Failed to send emergency SOS. Please try again or call emergency services directly.")
    } finally {
      setIsLoading(false)
    }
  }

  const emergencyNumbers = [
    { name: "National Emergency", number: "999", description: "Police, Fire, Ambulance" },
    { name: "Ambulance Service", number: "102", description: "Medical Emergency" },
    { name: "Police", number: "999", description: "Law Enforcement" },
    { name: "Fire Service", number: "16163", description: "Fire Emergency" },
  ]

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-red-500 flex items-center gap-2">
            <Ambulance className="w-7 h-7" />
            Emergency SOS
          </h1>
          <p className="text-muted-foreground">Get immediate medical assistance</p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-red-500 bg-red-500/10">
        <CardContent className="flex gap-3 py-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-500 mb-1">Life-Threatening Emergency?</p>
            <p className="mb-2">
              If you are experiencing a life-threatening emergency, call emergency services immediately at{" "}
              <strong>999</strong> or <strong>102</strong>.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="destructive" size="sm">
                <a href="tel:999">Call 999</a>
              </Button>
              <Button asChild variant="destructive" size="sm">
                <a href="tel:102">Call 102</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Emergencies */}
      {hasActiveEmergency && activeEmergencies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-500 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="text-amber-500 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Active Emergency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeEmergencies.map((emergency) => (
                <div key={emergency.id} className="p-4 rounded-lg bg-background border">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={emergency.status === "active" ? "destructive" : "default"}>
                      {emergency.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(emergency.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Type:</strong> {emergency.emergency_type}
                    </p>
                    {emergency.description && (
                      <p>
                        <strong>Description:</strong> {emergency.description}
                      </p>
                    )}
                    {emergency.location_address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        {emergency.location_address}
                      </p>
                    )}
                  </div>
                  {emergency.status === "responded" && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle className="w-4 h-4" />
                      Help is on the way
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Emergency SOS Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Emergency SOS</CardTitle>
          <CardDescription>Alert nearby healthcare workers and facilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Location</span>
              {location ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Located
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Getting location...
                </Badge>
              )}
            </div>
            {locationAddress && (
              <div className="p-3 rounded-lg bg-muted flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-sm">{locationAddress}</p>
              </div>
            )}
          </div>

          {/* Emergency Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Emergency Type <span className="text-red-500">*</span>
            </label>
            <Select value={emergencyType} onValueChange={setEmergencyType}>
              <SelectTrigger>
                <SelectValue placeholder="Select emergency type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical">Medical Emergency</SelectItem>
                <SelectItem value="accident">Accident/Injury</SelectItem>
                <SelectItem value="maternal">Maternal Emergency</SelectItem>
                <SelectItem value="cardiac">Cardiac Emergency</SelectItem>
                <SelectItem value="respiratory">Breathing Difficulty</SelectItem>
                <SelectItem value="severe_bleeding">Severe Bleeding</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Details</label>
            <Textarea
              placeholder="Describe the emergency situation..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Emergency Contact Info */}
          {patientProfile?.emergency_contact_name && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium mb-1">Emergency Contact</p>
              <p className="text-sm">
                {patientProfile.emergency_contact_name}
                {patientProfile.emergency_contact_phone && ` - ${patientProfile.emergency_contact_phone}`}
              </p>
            </div>
          )}

          <Button
            onClick={handleEmergencySOS}
            disabled={isLoading || !location || !emergencyType}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending SOS...
              </>
            ) : (
              <>
                <Ambulance className="w-5 h-5 mr-2" />
                Send Emergency SOS
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Emergency Numbers */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact Numbers</CardTitle>
          <CardDescription>Direct emergency service numbers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {emergencyNumbers.map((contact) => (
              <div key={contact.number} className="p-4 rounded-lg border bg-card">
                <h3 className="font-semibold mb-1">{contact.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{contact.description}</p>
                <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                  <a href={`tel:${contact.number}`} className="flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />
                    {contact.number}
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
