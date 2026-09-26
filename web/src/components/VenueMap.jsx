import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { SAMPLE_VENUES, formatLKR, FALLBACK_IMAGE } from "../api/supabase.js";

const customGlowIcon = (color = "#2563eb") => L.divIcon({
  className: "custom-map-pin",
  html: `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${color};
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 16px ${color}99, 0 4px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20]
});

export default function VenueMap({
  venues = SAMPLE_VENUES,
  selectedVenueId = null,
  onSelectVenue = null,
  height = "480px",
  pickerMode = false,
  onLocationPick = null,
  center = [6.9271, 79.8612],
  zoom = 8
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const pickerMarkerRef = useRef(null);
  const [activeCity, setActiveCity] = useState("All Sri Lanka");

  const LK_CITIES = [
    { name: "All Sri Lanka", coords: [7.8731, 80.7718], zoom: 7.5 },
    { name: "Colombo", coords: [6.9271, 79.8612], zoom: 12.5 },
    { name: "Kandy", coords: [7.2906, 80.6337], zoom: 13 },
    { name: "Galle", coords: [6.0535, 80.2210], zoom: 13 },
    { name: "Battaramulla", coords: [6.9038, 79.9142], zoom: 13 },
  ];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        // Clear any old leaflet id if container reused
        if (mapContainerRef.current._leaflet_id) {
          mapContainerRef.current._leaflet_id = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: center,
          zoom: zoom,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        // 100% Free Official OpenStreetMap Standard Tile Server — Zero Watermark, Zero Keys
        const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

        L.tileLayer(tileUrl, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: ["a", "b", "c"],
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        if (pickerMode && onLocationPick) {
          map.on("click", (e) => {
            const { lat, lng } = e.latlng;
            if (pickerMarkerRef.current) {
              pickerMarkerRef.current.setLatLng([lat, lng]);
            } else {
              pickerMarkerRef.current = L.marker([lat, lng], {
                icon: customGlowIcon("#10b981")
              }).addTo(map);
            }
            onLocationPick({ lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) });
          });
        }
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear old markers safely
      markersRef.current.forEach(m => {
        try { map.removeLayer(m); } catch {}
      });
      markersRef.current = [];

      // Add Sri Lankan venue markers
      venues.forEach(v => {
        if (!v.lat || !v.lng) return;

        const isSelected = selectedVenueId === v.id;
        const marker = L.marker([v.lat, v.lng], {
          icon: customGlowIcon(isSelected ? "#10b981" : "#3b82f6")
        }).addTo(map);

        const imgUrl = v.image || v.imageUrl || FALLBACK_IMAGE;

        const popupContent = `
          <div style="font-family: inherit; width: 240px; padding: 4px;">
            <img src="${imgUrl}" alt="${v.name}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block;" onerror="this.src='${FALLBACK_IMAGE}'" />
            <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px;">${v.name}</div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">${v.location}</div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
              <span>Capacity: <strong>${Number(v.capacity || 1000).toLocaleString()}</strong></span>
              <span style="color: #2563eb;">${formatLKR(v.pricePerHour)}/hr</span>
            </div>
            ${v.amenities ? `<div style="font-size: 10px; color: #4b5563; margin-bottom: 8px;">${v.amenities.slice(0, 2).join(" • ")}</div>` : ''}
            <button id="select-ven-${v.id}" style="
              width: 100%;
              background: #2563eb;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
            ">Select Venue</button>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 270 });

        marker.on("popupopen", () => {
          const btn = document.getElementById(`select-ven-${v.id}`);
          if (btn && onSelectVenue) {
            btn.onclick = () => onSelectVenue(v);
          }
        });

        if (isSelected) {
          marker.openPopup();
        }

        markersRef.current.push(marker);
      });
    } catch (err) {
      console.warn("Leaflet map initialization warning:", err);
    }

    return () => {
      // Optional cleanup on unmount
    };
  }, [venues, selectedVenueId, pickerMode, onLocationPick, center, zoom]);

  function jumpToCity(city) {
    setActiveCity(city.name);
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.flyTo(city.coords, city.zoom, { duration: 1.2 });
      } catch {}
    }
  }

  return (
    <div className="venue-map-container" style={{ position: "relative", width: "100%", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--c-border)", isolation: "isolate", zIndex: 1 }}>
      {/* City navigation pills */}
      <div style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(15, 23, 42, 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "6px 10px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid rgba(255, 255, 255, 0.12)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.06em", paddingRight: 4 }}>
            OpenStreetMap Sri Lanka
          </span>
          {LK_CITIES.map(c => (
            <button
              key={c.name}
              type="button"
              onClick={() => jumpToCity(c)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 9px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: activeCity === c.name ? "var(--c-blue)" : "rgba(255, 255, 255, 0.08)",
                color: activeCity === c.name ? "#ffffff" : "var(--c-text-2)",
                transition: "all 0.15s ease"
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--c-text-3)", whiteSpace: "nowrap", marginLeft: 8 }}>
          {venues.length} Sri Lankan Venues
        </div>
      </div>

      <div ref={mapContainerRef} style={{ height: height, width: "100%", background: "#0b0f19" }} />

      {pickerMode && (
        <div style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 10,
          background: "rgba(16, 185, 129, 0.95)",
          color: "#ffffff",
          padding: "6px 12px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
          Click on map to drop pin in Sri Lanka
        </div>
      )}
    </div>
  );
}
