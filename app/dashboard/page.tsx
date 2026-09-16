"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/api/auth-context";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { symptomCheckApi, consultationsApi } from "@/lib/api/client";

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [recentSymptomChecks, setRecentSymptomChecks] = useState<any[]>([]);
  const [upcomingConsultations, setUpcomingConsultations] = useState<any[]>([]);
  const [recordsCount, setRecordsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, isLoading, isAuthenticated, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load data in parallel
      const [symptomChecks, consultations] = await Promise.all([
        symptomCheckApi.getAll().catch(() => ({ data: [] })),
        consultationsApi.getAll().catch(() => ({ data: [] })),
      ]);

      setRecentSymptomChecks(symptomChecks.data.slice(0, 3));
      setUpcomingConsultations(consultations.data.slice(0, 3));
      setRecordsCount(0);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardContent
      user={user}
      profile={null}
      patientProfile={null}
      recentSymptomChecks={recentSymptomChecks}
      upcomingConsultations={upcomingConsultations}
      recordsCount={recordsCount}
    />
  );
}
