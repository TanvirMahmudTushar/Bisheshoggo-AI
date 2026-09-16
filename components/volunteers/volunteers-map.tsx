"use client";

import { useEffect, useRef } from "react";

interface Volunteer {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  location: string;
  latitude: number;
  longitude: number;
}

interface VolunteersMapProps {
  volunteers: Volunteer[];
}

export default function VolunteersMap({ volunteers }: VolunteersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const L = (window as any).L;
      if (!L || mapInstanceRef.current) return;

      // Initialize map centered on Bangladesh Hill Tracts
      const map = L.map(mapRef.current).setView([22.5, 92.0], 9);

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom icon for doctors
      const doctorIcon = L.divIcon({
        html: `<div style="background-color: #10b981; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-center: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.75 17 9 20l-1 1h8l-1-1-.75-3"></path>
            <path d="M3 13h18"></path>
            <path d="M5 17h14"></path>
            <path d="M6 13V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"></path>
            <path d="M8 11V9"></path>
            <path d="M12 11V7"></path>
            <path d="M16 11V9"></path>
          </svg>
        </div>`,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      // Add markers for each volunteer
      volunteers.forEach((volunteer) => {
        const marker = L.marker([volunteer.latitude, volunteer.longitude], {
          icon: doctorIcon,
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: #10b981;">${volunteer.name}</h3>
            <p style="margin-bottom: 4px;"><strong>${volunteer.specialization}</strong></p>
            <p style="margin-bottom: 4px;">📍 ${volunteer.location}</p>
            <p style="margin-bottom: 8px;">📞 <a href="tel:${volunteer.phone}" style="color: #10b981; font-weight: bold;">${volunteer.phone}</a></p>
            <a href="tel:${volunteer.phone}" style="display: inline-block; background-color: #10b981; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 14px;">Call Now</a>
          </div>
        `);
      });

      mapInstanceRef.current = map;
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [volunteers]);

  return (
    <div
      ref={mapRef}
      className="h-100 w-full rounded-lg border border-border/40 shadow-lg"
      style={{ zIndex: 0 }}
    />
  );
}


