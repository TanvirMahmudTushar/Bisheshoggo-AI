"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Video, Calendar, Clock, MessageSquare, ArrowLeft, Plus, CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { consultationsApi } from "@/lib/api/client"
import { toast } from "sonner"
import { motion } from "framer-motion"
import type { UserRole } from "@/lib/types"

interface ConsultationsContentProps {
  userId: string
  userRole: UserRole
  consultations: any[]
  providers: any[]
}

export function ConsultationsContent({ userId, userRole, consultations, providers }: ConsultationsContentProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState("")
  const [consultationType, setConsultationType] = useState("video")
  const [symptoms, setSymptoms] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-500"
      case "accepted":
        return "bg-blue-500/10 text-blue-500"
      case "in_progress":
        return "bg-green-500/10 text-green-500"
      case "completed":
        return "bg-gray-500/10 text-gray-500"
      case "cancelled":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const handleBookConsultation = async () => {
    if (!selectedProvider) {
      toast.error("Please select a provider")
      return
    }

    if (!symptoms.trim()) {
      toast.error("Please describe your symptoms")
      return
    }

    setIsLoading(true)

    try {
      await consultationsApi.create({
        provider_id: selectedProvider,
        consultation_type: consultationType,
        symptoms: symptoms,
      })

      toast.success("Consultation request sent successfully")
      setIsBookingOpen(false)
      setSelectedProvider("")
      setSymptoms("")

      // Refresh the page to show new consultation
      window.location.reload()
    } catch (error) {
      console.error("[ ] Error booking consultation:", error)
      toast.error("Failed to book consultation. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptConsultation = async (consultationId: string) => {
    setIsLoading(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('bisheshoggo_token') : null
      const response = await fetch(`${API_BASE_URL}/consultations/${consultationId}?new_status=accepted`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) throw new Error("Failed to accept")

      toast.success("Consultation accepted")
      window.location.reload()
    } catch (error) {
      console.error("[ ] Error accepting consultation:", error)
      toast.error("Failed to accept consultation")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelConsultation = async (consultationId: string) => {
    setIsLoading(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('bisheshoggo_token') : null
      const response = await fetch(`${API_BASE_URL}/consultations/${consultationId}?new_status=cancelled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) throw new Error("Failed to cancel")

      toast.success("Consultation cancelled")
      window.location.reload()
    } catch (error) {
      console.error("[ ] Error cancelling consultation:", error)
      toast.error("Failed to cancel consultation")
    } finally {
      setIsLoading(false)
    }
  }

  const pendingConsultations = consultations.filter((c) => c.status === "pending")
  const activeConsultations = consultations.filter((c) => c.status === "accepted" || c.status === "in_progress")
  const completedConsultations = consultations.filter((c) => c.status === "completed" || c.status === "cancelled")

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Telemedicine Consultations</h1>
            <p className="text-muted-foreground">Connect with healthcare providers remotely</p>
          </div>
        </div>
        {userRole === "patient" && (
          <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Book Consultation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Book a Consultation</DialogTitle>
                <DialogDescription>Connect with a healthcare provider</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>
                    Select Provider <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a healthcare provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider: any) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            <span>{provider.profiles?.full_name || "Provider"}</span>
                            {provider.specialization && (
                              <span className="text-xs text-muted-foreground">- {provider.specialization}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Consultation Type</Label>
                  <Select value={consultationType} onValueChange={setConsultationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video Call</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="in_person">In-Person (at facility)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Describe Your Symptoms <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Please describe your symptoms and health concerns..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button onClick={handleBookConsultation} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Book Consultation"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Consultations Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="active">
            Active
            {activeConsultations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeConsultations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {pendingConsultations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingConsultations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Active Consultations */}
        <TabsContent value="active" className="space-y-4">
          {activeConsultations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active consultations</p>
              </CardContent>
            </Card>
          ) : (
            activeConsultations.map((consultation: any) => (
              <motion.div key={consultation.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={
                            userRole === "patient"
                              ? consultation.provider?.avatar_url
                              : consultation.patient?.avatar_url
                          }
                        />
                        <AvatarFallback>
                          {userRole === "patient"
                            ? consultation.provider?.full_name?.charAt(0) || "D"
                            : consultation.patient?.full_name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {userRole === "patient"
                                ? consultation.provider?.full_name || "Doctor"
                                : consultation.patient?.full_name || "Patient"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getStatusColor(consultation.status)}>{consultation.status}</Badge>
                              <Badge variant="outline" className="capitalize">
                                {consultation.consultation_type}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {consultation.symptoms && (
                          <div>
                            <p className="text-sm font-medium mb-1">Symptoms:</p>
                            <p className="text-sm text-muted-foreground">{consultation.symptoms}</p>
                          </div>
                        )}

                        {consultation.scheduled_at && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(consultation.scheduled_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(consultation.scheduled_at).toLocaleTimeString()}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {consultation.consultation_type === "video" && (
                            <Button size="sm">
                              <Video className="w-4 h-4 mr-1" />
                              Join Video Call
                            </Button>
                          )}
                          {consultation.consultation_type === "chat" && (
                            <Button size="sm" variant="outline" className="bg-transparent">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Open Chat
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelConsultation(consultation.id)}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Pending Consultations */}
        <TabsContent value="pending" className="space-y-4">
          {pendingConsultations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending consultations</p>
              </CardContent>
            </Card>
          ) : (
            pendingConsultations.map((consultation: any) => (
              <motion.div key={consultation.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={
                            userRole === "patient"
                              ? consultation.provider?.avatar_url
                              : consultation.patient?.avatar_url
                          }
                        />
                        <AvatarFallback>
                          {userRole === "patient"
                            ? consultation.provider?.full_name?.charAt(0) || "D"
                            : consultation.patient?.full_name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {userRole === "patient"
                                ? consultation.provider?.full_name || "Doctor"
                                : consultation.patient?.full_name || "Patient"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getStatusColor(consultation.status)}>{consultation.status}</Badge>
                              <Badge variant="outline" className="capitalize">
                                {consultation.consultation_type}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {consultation.symptoms && (
                          <div>
                            <p className="text-sm font-medium mb-1">Symptoms:</p>
                            <p className="text-sm text-muted-foreground">{consultation.symptoms}</p>
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground">
                          Requested: {new Date(consultation.created_at).toLocaleString()}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {userRole !== "patient" && (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptConsultation(consultation.id)}
                              disabled={isLoading}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={userRole !== "patient" ? "outline" : "ghost"}
                            className={userRole !== "patient" ? "bg-transparent" : ""}
                            onClick={() => handleCancelConsultation(consultation.id)}
                            disabled={isLoading}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {userRole !== "patient" ? "Decline" : "Cancel"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          {completedConsultations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No consultation history</p>
              </CardContent>
            </Card>
          ) : (
            completedConsultations.map((consultation: any) => (
              <Card key={consultation.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={
                          userRole === "patient" ? consultation.provider?.avatar_url : consultation.patient?.avatar_url
                        }
                      />
                      <AvatarFallback>
                        {userRole === "patient"
                          ? consultation.provider?.full_name?.charAt(0) || "D"
                          : consultation.patient?.full_name?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {userRole === "patient"
                              ? consultation.provider?.full_name || "Doctor"
                              : consultation.patient?.full_name || "Patient"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(consultation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(consultation.status)}>{consultation.status}</Badge>
                      </div>

                      {consultation.diagnosis && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Diagnosis:</p>
                          <p className="text-sm text-muted-foreground">{consultation.diagnosis}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
