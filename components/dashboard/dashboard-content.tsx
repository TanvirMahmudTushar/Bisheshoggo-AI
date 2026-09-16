"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Heart,
  Stethoscope,
  MapPin,
  Video,
  Calendar,
  Activity,
  Ambulance,
  LogOut,
  User,
  Settings,
  Menu,
  Bell,
  ChevronRight,
  Bot,
  Scan,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import type { Profile, PatientProfile, SymptomCheck, Consultation } from "@/lib/types"

interface DashboardContentProps {
  user: { email: string; id: string; full_name?: string; avatar_url?: string }
  profile: Profile | null
  patientProfile: PatientProfile | null
  recentSymptomChecks: SymptomCheck[]
  upcomingConsultations: Consultation[]
  recordsCount: number
}

export function DashboardContent({
  user,
  profile,
  patientProfile,
  recentSymptomChecks,
  upcomingConsultations,
  recordsCount,
}: DashboardContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      // Clear token from localStorage
      localStorage.removeItem('bisheshoggo_token')
      // Clear any auth state
      const { setAuthToken } = await import('@/lib/api/client')
      setAuthToken(null)
      // Redirect to login
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    {
      icon: Stethoscope,
      title: "Offline Dr",
      description: "AI-powered offline medical assistant",
      href: "/check-symptoms",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      ring: "group-hover:shadow-emerald-500/20",
    },
    {
      icon: Ambulance,
      title: "Emergency SOS",
      description: "One-tap emergency alert",
      href: "/emergency",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      ring: "group-hover:shadow-red-500/20",
    },
    {
      icon: Bot,
      title: "AI Medical Assistant",
      description: "Chat with AI doctor",
      href: "/dashboard/ai-chat",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      ring: "group-hover:shadow-cyan-500/20",
    },
    {
      icon: Scan,
      title: "Scan Prescription",
      description: "OCR prescription analysis",
      href: "/dashboard/scan-prescription",
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      ring: "group-hover:shadow-indigo-500/20",
    },
    {
      icon: MapPin,
      title: "Find Volunteers",
      description: "Connect with volunteer doctors",
      href: "/dashboard/volunteers",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      ring: "group-hover:shadow-blue-500/20",
    },
    {
      icon: Video,
      title: "Telemedicine",
      description: "Video consultations",
      href: "/dashboard/consultations",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      ring: "group-hover:shadow-purple-500/20",
    },
  ]

  const stats = [
    {
      label: "Health Checks",
      value: recentSymptomChecks.length,
      icon: Activity,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Consultations",
      value: upcomingConsultations.length,
      icon: Video,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Medical Records",
      value: recordsCount,
      icon: Scan,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
    },
  ]

  const navLinks = [
    { href: "/dashboard", icon: Heart, label: "Dashboard" },
    { href: "/check-symptoms", icon: Stethoscope, label: "Offline Dr" },
    { href: "/emergency", icon: Ambulance, label: "Emergency SOS", danger: true },
    { href: "/dashboard/ai-chat", icon: Bot, label: "AI Assistant" },
    { href: "/dashboard/scan-prescription", icon: Scan, label: "Scan Prescription" },
    { href: "/dashboard/volunteers", icon: MapPin, label: "Find Volunteers" },
    { href: "/dashboard/consultations", icon: Video, label: "Telemedicine" },
    { href: "/history", icon: Activity, label: "Case History" },
    { href: "/chw-dashboard", icon: User, label: "CHW Dashboard" },
  ]

  const NavItems = () => (
    <>
      {navLinks.map((item) => {
        const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
              active
                ? "bg-primary/12 text-primary"
                : item.danger
                  ? "text-foreground/90 hover:bg-red-500/10 hover:text-red-400"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active-bar"
                className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-sidebar">
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="rounded-xl bg-linear-to-br from-medical-blue/25 to-medical-teal/10 p-1 shadow-elevated">
              <Image src="/logo.png" alt="Bisheshoggo AI" width={36} height={36} className="rounded-lg" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Bisheshoggo AI</h1>
              <p className="text-xs text-muted-foreground">Doctor you need</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          <Link
            href="/dashboard/profile"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              pathname === "/dashboard/profile" ? "bg-primary/12 text-primary" : "hover:bg-muted",
            )}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              pathname === "/dashboard/settings" ? "bg-primary/12 text-primary" : "hover:bg-muted",
            )}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-400 hover:bg-red-500/10" onClick={handleSignOut} disabled={isLoading}>
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="p-6 border-b">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-linear-to-br from-medical-blue/25 to-medical-teal/10 p-1 shadow-elevated">
                      <Image src="/logo.png" alt="Bisheshoggo AI" width={36} height={36} className="rounded-lg" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold leading-tight">Bisheshoggo AI</h1>
                      <p className="text-xs text-muted-foreground">Doctor you need</p>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                  <NavItems />
                </nav>

                <div className="p-4 border-t space-y-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-400 hover:bg-red-500/10" onClick={handleSignOut} disabled={isLoading}>
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex-1">
              <h2 className="text-lg font-semibold lg:hidden">Dashboard</h2>
            </div>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse-glow" />
            </Button>

            <Link href="/dashboard/profile">
              <Avatar className="h-9 w-9 ring-2 ring-transparent hover:ring-primary/40 transition-all">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/15 text-primary font-semibold">{user?.full_name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-card via-card to-medical-blue/5 p-6 shadow-elevated"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-medical-blue/15 blur-[80px]" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Welcome back, {user?.full_name}!</h1>
                <p className="text-muted-foreground mt-1">Here&apos;s your health dashboard overview</p>
              </div>
              <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-medical-blue/20 to-medical-teal/10 border border-white/10">
                <Heart className="h-8 w-8 text-primary" />
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover-lift">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold tabular-nums">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.06 }}
                >
                  <Link href={action.href}>
                    <Card className={cn("hover-lift cursor-pointer group h-full", action.ring)}>
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-start justify-between">
                          <div className={`w-12 h-12 rounded-xl ${action.bgColor} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                            <action.icon className={`w-6 h-6 ${action.color}`} />
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                        </div>
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upcoming Consultations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Upcoming Consultations</CardTitle>
                  <Link href="/dashboard/consultations">
                    <Button variant="ghost" size="sm">
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>Your scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingConsultations.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
                      <Calendar className="w-7 h-7 text-purple-400" />
                    </div>
                    <p>No upcoming consultations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingConsultations.map((consultation: any) => (
                      <div key={consultation.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Avatar>
                          <AvatarImage src={consultation.provider?.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-purple-500/15 text-purple-300">{consultation.provider?.full_name?.charAt(0) || "D"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{consultation.provider?.full_name || "Doctor"}</p>
                          <p className="text-sm text-muted-foreground">
                            {consultation.scheduled_at
                              ? new Date(consultation.scheduled_at).toLocaleDateString()
                              : "Pending"}
                          </p>
                        </div>
                        <Badge variant={consultation.status === "accepted" ? "default" : "secondary"}>
                          {consultation.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Symptom Checks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Health Checks</CardTitle>
                  <Link href="/check-symptoms">
                    <Button variant="ghost" size="sm">
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>Your symptom history</CardDescription>
              </CardHeader>
              <CardContent>
                {recentSymptomChecks.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <Stethoscope className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p>No symptom checks yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSymptomChecks.map((check) => (
                      <div key={check.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <Badge
                            variant={
                              check.severity === "high"
                                ? "destructive"
                                : check.severity === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {check.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(check.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{check.symptoms.slice(0, 3).join(", ")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
