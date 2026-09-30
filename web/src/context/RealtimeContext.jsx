/**
 * RealtimeContext — Central Supabase Realtime hub for the entire app.
 *
 * Subscribes ONCE to Supabase Realtime channels for:
 *   • "Events"         table — INSERT / UPDATE / DELETE
 *   • "Venues"         table — INSERT / UPDATE / DELETE
 *   • "Registrations"  table — INSERT / UPDATE / DELETE
 *   • "VendorBookings" table — INSERT / UPDATE / DELETE
 *
 * All pages consume `useRealtime()` — no page subscribes independently.
 * On any DB change, the context merges the delta into its state and also
 * keeps dashboard state synchronized with Supabase.
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, FALLBACK_IMAGE } from "../api/supabase.js";
import { api } from "../api/client.js";

const RealtimeContext = createContext(null);

// ─── Row mappers: Supabase PascalCase → camelCase used by the frontend ────────
function mapEvent(row) {
  return {
    id: row.Id ?? row.id,
    organizerId: row.OrganizerId ?? row.organizerId,
    organizerName: row.OrganizerName ?? row.organizerName ?? "Organizer",
    organizerEmail: row.OrganizerEmail ?? row.organizerEmail ?? "",
    title: row.Title ?? row.title,
    description: row.Description ?? row.description ?? "",
    category: row.Category ?? row.category ?? "Other",
    venueId: row.VenueId ?? row.venueId ?? "",
    location: row.Location ?? row.location ?? "",
    lat: row.Lat ?? row.lat,
    lng: row.Lng ?? row.lng,
    startDate: row.StartDate ?? row.startDate,
    endDate: row.EndDate ?? row.endDate,
    capacity: row.Capacity ?? row.capacity ?? 0,
    status: row.Status ?? row.status ?? "Draft",
    image: row.Image ?? row.image ?? row.ImageUrl ?? row.imageUrl,
    ticketTypes: row.TicketTypes ?? row.ticketTypes ?? [],
  };
}

function mapVenue(row) {
  const loc = `${row.Name ?? row.name ?? ""} ${row.Location ?? row.location ?? ""}`.toLowerCase();
  let defaultLat = 6.9271;
  let defaultLng = 79.8612;
  let defaultCity = "Colombo";

  if (loc.includes("kandy") || loc.includes("peradeniya")) { defaultLat = 7.2906; defaultLng = 80.6337; defaultCity = "Kandy"; }
  else if (loc.includes("galle") || loc.includes("hikkaduwa") || loc.includes("unawatuna")) { defaultLat = 6.0535; defaultLng = 80.2210; defaultCity = "Galle"; }
  else if (loc.includes("battaramulla") || loc.includes("waters edge")) { defaultLat = 6.9038; defaultLng = 79.9142; defaultCity = "Battaramulla"; }
  else if (loc.includes("jaffna")) { defaultLat = 9.6615; defaultLng = 80.0255; defaultCity = "Jaffna"; }
  else if (loc.includes("negombo")) { defaultLat = 7.2008; defaultLng = 79.8736; defaultCity = "Negombo"; }
  else if (loc.includes("nuwara eliya")) { defaultLat = 6.9497; defaultLng = 80.7891; defaultCity = "Nuwara Eliya"; }
  else if (loc.includes("port city")) { defaultLat = 6.9344; defaultLng = 79.8428; defaultCity = "Colombo"; }
  else if (loc.includes("bmich")) { defaultLat = 6.9010; defaultLng = 79.8736; defaultCity = "Colombo"; }
  else if (loc.includes("nelum pokuna")) { defaultLat = 6.9110; defaultLng = 79.8649; defaultCity = "Colombo"; }

  return {
    id: row.Id ?? row.id,
    vendorId: row.OwnerId ?? row.vendorId ?? "",
    name: row.Name ?? row.name,
    location: row.Location ?? row.location,
    city: row.City ?? row.city ?? defaultCity,
    lat: Number(row.Lat ?? row.lat ?? defaultLat),
    lng: Number(row.Lng ?? row.lng ?? defaultLng),
    capacity: row.Capacity ?? row.capacity ?? 0,
    pricePerHour: row.PricePerHour ?? row.pricePerHour ?? 0,
    isActive: row.IsActive ?? row.isActive ?? true,
    image: row.Image ?? row.image ?? FALLBACK_IMAGE,
    amenities: row.Amenities ?? row.amenities ?? ["WiFi", "Parking", "Central AC"],
    description: row.Description ?? row.description ?? "",
  };
}

function mapRegistration(row) {
  return {
    id: row.Id ?? row.id,
    eventId: row.EventId ?? row.eventId,
    attendeeId: row.AttendeeId ?? row.attendeeId,
    status: row.Status ?? row.status,
    createdAt: row.CreatedAt ?? row.createdAt,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function RealtimeProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [vendorBookings, setVendorBookings] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const channelRef = useRef(null);

  // Floating toast notifications
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  // ─── Initial data load ─────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    // 1. Events — Supabase first, then the API backed by the same database.
    try {
      const dbEvents = [];
      let sbErr = null;
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("Events")
          .select("*")
          .order("CreatedAt", { ascending: false })
          .range(from, from + 999);
        if (error) { sbErr = error; break; }
        dbEvents.push(...(data || []));
        if (!data || data.length < 1000) break;
      }

      if (!sbErr && dbEvents) {
        const mapped = dbEvents.map(mapEvent);
        setEvents(mapped);
        localStorage.setItem("ef_events", JSON.stringify(mapped));
      } else {
        try {
          let page = 1;
          let items = [];
          let total = Infinity;
          while (items.length < total) {
            const res = await api.listEvents({ page, pageSize: 200 });
            const pageItems = res?.items ?? res ?? [];
            items = items.concat(pageItems);
            total = res?.total ?? (pageItems.length < 200 ? items.length : Infinity);
            if (pageItems.length < 200) break;
            page += 1;
          }
          const mapped = items.map(mapEvent);
          setEvents(mapped);
          localStorage.setItem("ef_events", JSON.stringify(mapped));
        } catch {
          setEvents([]);
          localStorage.setItem("ef_events", "[]");
        }
      }
    } catch {
      setEvents([]);
      localStorage.setItem("ef_events", "[]");
    }

    // 2. Venues — load authoritative records from Supabase
    try {
      const { data: dbVenues, error: vErr } = await supabase
        .from("Venues")
        .select("*")
        .order("CreatedAt", { ascending: false });

      if (!vErr && dbVenues) {
        const mapped = dbVenues.map(mapVenue);
        setVenues(mapped);
        localStorage.setItem("ef_venues", JSON.stringify(mapped));
      } else {
        try {
          const res = await api.searchVenues({ pageSize: 200 });
          const items = res?.items ?? res ?? [];
          const mapped = items.map(mapVenue);
          setVenues(mapped);
          localStorage.setItem("ef_venues", JSON.stringify(mapped));
        } catch {
          setVenues([]);
          localStorage.setItem("ef_venues", "[]");
        }
      }
    } catch {
      setVenues([]);
      localStorage.setItem("ef_venues", "[]");
    }
  }, []);

  // ─── Supabase Realtime subscription ───────────────────────────────────────
  useEffect(() => {
    loadInitialData();

    const channel = supabase
      .channel("eventflow-realtime", { config: { broadcast: { self: true } } })

      // Events ───────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Events" }, ({ new: row }) => {
        const ev = mapEvent(row);
        setEvents(prev => {
          if (prev.some(e => e.id === ev.id)) return prev;
          const next = [ev, ...prev];
          localStorage.setItem("ef_events", JSON.stringify(next));
          return next;
        });
        setLastUpdate(Date.now());
        addToast(`🎉 New event: "${ev.title}"`, "success");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Events" }, ({ new: row }) => {
        const ev = mapEvent(row);
        setEvents(prev => {
          const next = prev.map(e => e.id === ev.id ? { ...e, ...ev } : e);
          localStorage.setItem("ef_events", JSON.stringify(next));
          return next;
        });
        setLastUpdate(Date.now());
        addToast(`✏️ Event updated: "${ev.title}"`, "info");
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Events" }, ({ old: row }) => {
        const id = row.Id ?? row.id;
        setEvents(prev => {
          const next = prev.filter(e => e.id !== id);
          localStorage.setItem("ef_events", JSON.stringify(next));
          return next;
        });
        setLastUpdate(Date.now());
        addToast("🗑️ An event was removed", "info");
      })

      // Venues ───────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Venues" }, ({ new: row }) => {
        const venue = mapVenue(row);
        setVenues(prev => {
          if (prev.some(v => v.id === venue.id)) return prev;
          const next = [venue, ...prev];
          localStorage.setItem("ef_venues", JSON.stringify(next));
          return next;
        });
        setLastUpdate(Date.now());
        addToast(`🏛️ New venue: "${venue.name}"`, "info");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Venues" }, ({ new: row }) => {
        const venue = mapVenue(row);
        setVenues(prev => {
          const next = prev.map(v => v.id === venue.id ? { ...v, ...venue } : v);
          localStorage.setItem("ef_venues", JSON.stringify(next));
          return next;
        });
        setLastUpdate(Date.now());
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Venues" }, ({ old: row }) => {
        const id = row.Id ?? row.id;
        setVenues(prev => {
          const next = prev.filter(v => v.id !== id);
          localStorage.setItem("ef_venues", JSON.stringify(next));
          return next;
        });
        setLastUpdate(Date.now());
      })

      // Registrations ────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Registrations" }, ({ new: row }) => {
        const reg = mapRegistration(row);
        setRegistrations(prev => [...prev, reg]);
        setLastUpdate(Date.now());
        addToast("👤 New attendee registered!", "success");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Registrations" }, ({ new: row }) => {
        const reg = mapRegistration(row);
        setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, ...reg } : r));
        setLastUpdate(Date.now());
      })

      // VendorBookings ───────────────────────────────────────────────────────
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "VendorBookings" }, ({ new: row }) => {
        setVendorBookings(prev => [...prev, row]);
        setLastUpdate(Date.now());
        addToast("📋 New vendor booking request", "info");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "VendorBookings" }, ({ new: row }) => {
        setVendorBookings(prev =>
          prev.map(b => (b.Id ?? b.id) === (row.Id ?? row.id) ? { ...b, ...row } : b)
        );
        setLastUpdate(Date.now());
      })

      .subscribe(status => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadInitialData, addToast]);

  // ─── Mutators ─────────────────────────────────────────────────────────────

  /** Create or update an event. Writes to ASP.NET Core API, updates local state immediately. */
  const upsertEvent = useCallback(async (eventData, isEdit = false) => {
    let savedEvent = { ...eventData };
    let apiError = null;

    try {
      const payload = {
        organizerId: eventData.organizerId,
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        location: eventData.location,
        capacity: Number(eventData.capacity),
        ticketTypes: (eventData.ticketTypes || []).map(tt => ({
          name: tt.name,
          price: tt.price,
          quantity: tt.quantity,
        })),
      };

      const res = isEdit
        ? await api.updateEvent(eventData.id, payload)
        : await api.createEvent(payload);

      if (res) savedEvent = { ...eventData, ...mapEvent(res) };
    } catch (err) {
      apiError = err.message;
    }

    // Direct write to Supabase Events table
    try {
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const eventId = isUUID(savedEvent.id) ? savedEvent.id : crypto.randomUUID();
      savedEvent.id = eventId;
      const now = new Date().toISOString();
      await supabase.from("Events").upsert({
        Id: eventId,
        OrganizerId: savedEvent.organizerId || "00000000-0000-0000-0000-0000000000aa",
        Title: savedEvent.title,
        Description: savedEvent.description || "",
        Category: savedEvent.category || "Technology",
        StartDate: savedEvent.startDate || now,
        EndDate: savedEvent.endDate || now,
        Location: savedEvent.location || "",
        Capacity: Number(savedEvent.capacity) || 0,
        Status: savedEvent.status || "Published",
        CreatedAt: savedEvent.createdAt || now,
        UpdatedAt: now
      });
    } catch (sbErr) {
      console.warn("[RealtimeContext] Supabase Events upsert:", sbErr);
    }

    // Immediately reflect in state (optimistic update)
    setEvents(prev => {
      const next = isEdit
        ? prev.map(e => e.id === savedEvent.id ? { ...e, ...savedEvent } : e)
        : prev.some(e => e.id === savedEvent.id)
          ? prev
          : [savedEvent, ...prev];
      localStorage.setItem("ef_events", JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
      return next;
    });

    setLastUpdate(Date.now());
    return { event: savedEvent, error: apiError };
  }, []);

  /** Cancel/delete an event locally + API call + Supabase. */
  const deleteEvent = useCallback(async (id) => {
    try { await api.cancelEvent(id); } catch {}
    try { await supabase.from("Events").delete().eq("Id", id); } catch {}
    setEvents(prev => {
      const next = prev.filter(e => e.id !== id);
      localStorage.setItem("ef_events", JSON.stringify(next));
      return next;
    });
    setLastUpdate(Date.now());
  }, []);

  /** Force re-fetch all data from the backend. */
  const refresh = useCallback(() => loadInitialData(), [loadInitialData]);

  const value = {
    events,
    setEvents,
    venues,
    setVenues,
    registrations,
    vendorBookings,
    connected,
    lastUpdate,
    toasts,
    upsertEvent,
    deleteEvent,
    refresh,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <RealtimeToasts toasts={toasts} />
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used inside <RealtimeProvider>");
  return ctx;
}

// ─── Toast UI ─────────────────────────────────────────────────────────────────
function RealtimeToasts({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success"
            ? "linear-gradient(135deg,rgba(16,185,129,.18),rgba(5,150,105,.10))"
            : "linear-gradient(135deg,rgba(59,130,246,.18),rgba(37,99,235,.10))",
          border: `1px solid ${t.type === "success" ? "rgba(16,185,129,.4)" : "rgba(59,130,246,.4)"}`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 12,
          padding: "10px 16px",
          color: "#e2e8f0",
          fontSize: 13,
          fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,.3)",
          display: "flex", alignItems: "center", gap: 10,
          minWidth: 240, maxWidth: 340,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: t.type === "success" ? "#10b981" : "#3b82f6",
            boxShadow: `0 0 8px ${t.type === "success" ? "#10b981" : "#3b82f6"}`,
          }} />
          {t.message}
        </div>
      ))}
    </div>
  );
}
