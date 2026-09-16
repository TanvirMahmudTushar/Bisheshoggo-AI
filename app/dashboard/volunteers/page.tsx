"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, MapPin, Stethoscope, Clock, User, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { providersApi } from "@/lib/api/client";
import { offlineStorage } from "@/lib/offline/storage";

// Dynamic import to avoid SSR issues with Leaflet
const VolunteersMap = dynamic(() => import("@/components/volunteers/volunteers-map"), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-slate-900 rounded-lg flex items-center justify-center">Loading map...</div>
});

interface Volunteer {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  location: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  availability: string;
  languages: string[];
  experience: string;
}

const PROVIDERS_CACHE_KEY = "providers_cache";

function mapProvider(provider: any): Volunteer {
  return {
    id: provider.id,
    name: provider.profile?.full_name || "Unknown Doctor",
    specialization: provider.specialization || "General Physician",
    phone: provider.profile?.phone_number || "",
    location: provider.location || "Location not set",
    district: provider.district || "Unknown",
    latitude: typeof provider.latitude === "number" ? provider.latitude : null,
    longitude: typeof provider.longitude === "number" ? provider.longitude : null,
    availability: provider.is_available ? "Available Now" : "Currently Unavailable",
    languages: provider.languages || [],
    experience: provider.years_of_experience ? `${provider.years_of_experience} years` : "N/A",
  };
}

export default function VolunteersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await providersApi.getAll();
        const mapped = (response.data || []).map(mapProvider);
        setVolunteers(mapped);
        offlineStorage.set(PROVIDERS_CACHE_KEY, mapped, true);
      } catch (error) {
        console.log("[ ] Providers fetch failed, using offline cache:", error);
        setVolunteers(offlineStorage.get(PROVIDERS_CACHE_KEY) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let filtered = volunteers;

    if (searchTerm) {
      filtered = filtered.filter(vol =>
        vol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vol.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vol.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDistrict !== "all") {
      filtered = filtered.filter(vol => vol.district === selectedDistrict);
    }

    setFilteredVolunteers(filtered);
  }, [volunteers, searchTerm, selectedDistrict]);

  const districts = Array.from(new Set(volunteers.map(v => v.district)));
  const mappableVolunteers = filteredVolunteers.filter(
    (v): v is Volunteer & { latitude: number; longitude: number } => v.latitude !== null && v.longitude !== null
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Stethoscope className="h-8 w-8 text-primary" />
          Find Volunteer Doctors
        </h1>
        <p className="text-xl text-emerald-400 font-semibold mt-2">
          📞 Call us anytime - We're here to help!
        </p>
        <p className="text-muted-foreground">
          Connect with volunteer doctors serving in Bangladesh's Hill Tracts
        </p>
      </div>

      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, specialization, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="px-4 py-2 rounded-md border bg-background"
        >
          <option value="all">All Districts</option>
          {districts.map(district => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <VolunteersMap volunteers={mappableVolunteers} />
      </div>

      {loading && (
        <Card className="p-12 text-center mb-6">
          <p className="text-muted-foreground">Loading volunteer doctors...</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVolunteers.map((volunteer) => (
          <Card key={volunteer.id} className="hover:shadow-lg transition-shadow border-emerald-900/20">
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-5 w-5 text-primary" />
                    <span className="text-lg">{volunteer.name}</span>
                  </div>
                  <p className="text-sm text-emerald-400 font-medium">
                    {volunteer.specialization}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${volunteer.phone}`} className="font-semibold hover:underline">
                    {volunteer.phone}
                  </a>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">{volunteer.location}</p>
                    <p className="text-xs text-muted-foreground">{volunteer.district}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{volunteer.availability}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Experience: {volunteer.experience}</p>
                <p className="text-xs text-muted-foreground">Languages: {volunteer.languages.join(", ")}</p>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => window.location.href = `tel:${volunteer.phone}`}
              >
                <Phone className="mr-2 h-4 w-4" />
                Call Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && filteredVolunteers.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No volunteers found matching your search</p>
        </Card>
      )}
    </div>
  );
}


