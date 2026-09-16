"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { profileApi } from "@/lib/api/client"
import { toast } from "sonner"
import type { Profile, PatientProfile, ProviderProfile } from "@/lib/types"

interface ProfileContentProps {
  user: { email: string; id: string }
  profile: Profile | null
  roleProfile: PatientProfile | ProviderProfile | null
}

export function ProfileContent({ user, profile, roleProfile }: ProfileContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Basic profile fields
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [phone, setPhone] = useState(profile?.phone || "")

  // Patient profile fields
  const [dateOfBirth, setDateOfBirth] = useState((roleProfile as PatientProfile)?.date_of_birth || "")
  const [bloodGroup, setBloodGroup] = useState((roleProfile as PatientProfile)?.blood_group || "")
  const [gender, setGender] = useState((roleProfile as PatientProfile)?.gender || "")
  const [address, setAddress] = useState((roleProfile as PatientProfile)?.address || "")
  const [emergencyContactName, setEmergencyContactName] = useState(
    (roleProfile as PatientProfile)?.emergency_contact_name || "",
  )
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    (roleProfile as PatientProfile)?.emergency_contact_phone || "",
  )

  // Provider profile fields
  const [specialization, setSpecialization] = useState((roleProfile as ProviderProfile)?.specialization || "")
  const [qualification, setQualification] = useState((roleProfile as ProviderProfile)?.qualification || "")
  const [yearsOfExperience, setYearsOfExperience] = useState(
    (roleProfile as ProviderProfile)?.years_of_experience?.toString() || "",
  )
  const [consultationFee, setConsultationFee] = useState(
    (roleProfile as ProviderProfile)?.consultation_fee?.toString() || "",
  )
  const [availableForTelemedicine, setAvailableForTelemedicine] = useState(
    (roleProfile as ProviderProfile)?.available_for_telemedicine ?? true,
  )
  const [bio, setBio] = useState((roleProfile as ProviderProfile)?.bio || "")

  const handleSaveProfile = async () => {
    setIsLoading(true)

    try {
      // Update profile via API
      const profileData: any = {
        full_name: fullName,
        phone: phone,
      }

      if (profile?.role === "patient") {
        profileData.date_of_birth = dateOfBirth || null
        profileData.blood_group = bloodGroup || null
        profileData.gender = gender || null
        profileData.address = address || null
        profileData.emergency_contact_name = emergencyContactName || null
        profileData.emergency_contact_phone = emergencyContactPhone || null
      } else if (profile?.role === "doctor" || profile?.role === "community_health_worker") {
        profileData.specialization = specialization || null
        profileData.qualification = qualification || null
        profileData.years_of_experience = yearsOfExperience ? Number.parseInt(yearsOfExperience) : null
        profileData.consultation_fee = consultationFee ? Number.parseFloat(consultationFee) : null
        profileData.available_for_telemedicine = availableForTelemedicine
        profileData.bio = bio || null
      }

      await profileApi.updateProfile(profileData)

      toast.success("Profile updated successfully")
      setIsEditing(false)
    } catch (error) {
      console.error("[ ] Error updating profile:", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isLoading}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">{fullName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold mb-1">{fullName || "User"}</h2>
              <Badge variant="outline" className="capitalize">
                {profile?.role?.replace("_", " ")}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="flex-1"
                  />
                ) : (
                  <span className="text-sm">{fullName || "Not set"}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {isEditing ? (
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
                ) : (
                  <span className="text-sm">{phone || "Not set"}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient-specific fields */}
      {profile?.role === "patient" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
              <CardDescription>Your personal health details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="flex-1"
                      />
                    ) : (
                      <span className="text-sm">{dateOfBirth || "Not set"}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  {isEditing ? (
                    <Input
                      id="bloodGroup"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      placeholder="e.g., A+, B-, O+"
                    />
                  ) : (
                    <span className="text-sm">{bloodGroup || "Not set"}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  {isEditing ? (
                    <Input id="gender" value={gender} onChange={(e) => setGender(e.target.value)} />
                  ) : (
                    <span className="text-sm">{gender || "Not set"}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  {isEditing ? (
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                  ) : (
                    <span className="text-sm">{address || "Not set"}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Person to contact in case of emergency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Name</Label>
                  {isEditing ? (
                    <Input
                      id="emergencyContactName"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                    />
                  ) : (
                    <span className="text-sm">{emergencyContactName || "Not set"}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="emergencyContactPhone"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    />
                  ) : (
                    <span className="text-sm">{emergencyContactPhone || "Not set"}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Provider-specific fields */}
      {(profile?.role === "doctor" || profile?.role === "community_health_worker") && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Your medical credentials and expertise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  {isEditing ? (
                    <Input
                      id="specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g., General Medicine, Pediatrics"
                    />
                  ) : (
                    <span className="text-sm">{specialization || "Not set"}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  {isEditing ? (
                    <Input
                      id="qualification"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      placeholder="e.g., MBBS, MD"
                    />
                  ) : (
                    <span className="text-sm">{qualification || "Not set"}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                  {isEditing ? (
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                    />
                  ) : (
                    <span className="text-sm">{yearsOfExperience || "Not set"}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultationFee">Consultation Fee (BDT)</Label>
                  {isEditing ? (
                    <Input
                      id="consultationFee"
                      type="number"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                    />
                  ) : (
                    <span className="text-sm">{consultationFee ? `৳${consultationFee}` : "Not set"}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Tell patients about yourself..."
                  />
                ) : (
                  <p className="text-sm">{bio || "Not set"}</p>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="telemedicine" className="cursor-pointer">
                    Available for Telemedicine
                  </Label>
                  <p className="text-sm text-muted-foreground">Accept video/chat consultations</p>
                </div>
                <Switch
                  id="telemedicine"
                  checked={availableForTelemedicine}
                  onCheckedChange={setAvailableForTelemedicine}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
