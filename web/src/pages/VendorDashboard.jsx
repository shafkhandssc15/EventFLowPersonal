import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IcBuilding, IcBriefcase, IcPlus, IcMapPin, IcStar, IcCheck,
  IcCompass, IcUsers, IcClock, IcMail, IcShield, IcX, IcEye
} from "../components/Icons.jsx";
import VenueMap from "../components/VenueMap.jsx";
import { supabase, formatLKR, FALLBACK_IMAGE, getVenueCoordinates } from "../api/supabase.js";
import ImageUploader from "../components/ImageUploader.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";


const SERVICE_TYPES = ["Audio/Visual", "Catering", "Photography", "Security", "Decoration", "Transportation", "Other"];


export default function VendorDashboard() {
  const { user } = useAuth();
  const { events: liveEvents } = useRealtime();
  const navigate = useNavigate();

  const [venues, setVenues]     = useState([]);
  const [vendors, setVendors]   = useState([]);
  const [tab, setTab]           = useState("venues"); // "venues" | "map" | "vendors" | "inquiries"
  const [venueFilter, setVenueFilter] = useState("all"); // "mine" | "all"
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueDetailModal, setVenueDetailModal] = useState(null);
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState("All");

  function handleEditVendor(vnd) {
    if (!canCreateVenue && vnd.ownerId !== user?.id && user?.role !== "Admin") {
      setError("Permission denied: You can only edit vendor services that you manage.");
      return;
    }
    setRf({
      name: vnd.name,
      serviceType: vnd.serviceType || "Audio/Visual",
      pricePerService: vnd.pricePerService || 150000,
      contactName: vnd.contactName || user?.name || "",
      contactPhone: vnd.contactPhone || "+94 77 123 4567",
      image: vnd.image || vnd.imageUrl || FALLBACK_IMAGE,
      description: vnd.description || ""
    });
    setEditingVendorId(vnd.id);
    setTab("vendors");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDeleteVendor(id) {
    const target = vendors.find(v => v.id === id);
    if (!window.confirm(`Are you sure you want to delete vendor service "${target?.name || 'this vendor'}"?`)) return;

    try {
      await supabase.from("Vendors").delete().eq("Id", id);
      setVendors(prev => prev.filter(v => v.id !== id));
      setSuccess(`Vendor service "${target?.name}" removed from platform.`);
    } catch (err) {
      setError("Failed to delete vendor: " + err.message);
    }
  }


  // Availability calendar & Booking inquiry state
  const [platformEvents, setPlatformEvents] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [selectedVenueForInquiry, setSelectedVenueForInquiry] = useState(null);
  const [selectedVenueCalendar, setSelectedVenueCalendar] = useState(null);
  const [inquiryForm, setInquiryForm] = useState({
    eventTitle: "",
    requestedDate: "",
    attendeesCount: 500,
    contactPhone: "",
    notes: ""
  });


  // Map Link & Form state for easy venue registration
  const [mapLinkInput, setMapLinkInput] = useState("");
  const [vf, setVf] = useState({
    name: "",
    location: "",
    city: "Colombo",
    capacity: 1000,
    pricePerHour: 75000,
    lat: 6.9010,
    lng: 79.8736,
    halls: "Main Grand Hall, Banquet Wing, VIP Suite",
    amenities: "Fiber WiFi 1Gbps, 4K LED Screen, 3-Phase Backup Generator, Central AC, VIP Green Rooms, 250+ Parking, Commercial Kitchen",
    contactName: "Sunil Jayasuriya",
    contactPhone: "+94 11 269 1111",
    contactEmail: "reservations@bmich.lk",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
    description: "Premier international conference facility with state-of-the-art audiovisual systems and banquet amenities."
  });

  const [rf, setRf] = useState({
    name: "",
    serviceType: "Audio/Visual",
    pricePerService: 150000,
    contactName: "",
    contactPhone: "+94 77 123 4567",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
    description: "Professional stage and concert production across Sri Lanka."
  });

  function loadAll() {
    setLoading(true);
    setVenues([]);

    // Direct fetch from Supabase Venues table
    supabase
      .from("Venues")
      .select("*")
      .order("CreatedAt", { ascending: false })
      .then(({ data: dbVenues, error: vErr }) => {
        if (!vErr && dbVenues) {
          const mapped = dbVenues.map(row => {
            const venueName = row.Name || row.name || "";
            const venueLoc = row.Location || row.location || "";
            const venueCity = row.City || row.city || "";
            const coords = getVenueCoordinates(venueName, venueLoc, venueCity);

            return {
              id: row.Id || row.id,
              ownerId: row.OwnerId || row.vendorId || row.ownerId,
              vendorId: row.OwnerId || row.vendorId || row.ownerId,
              name: venueName,
              location: venueLoc,
              city: venueCity || coords.city,
              capacity: Number(row.Capacity || row.capacity) || 1000,
              pricePerHour: Number(row.PricePerHour || row.pricePerHour) || 0,
              image: row.Image || row.image || FALLBACK_IMAGE,
              lat: Number(row.Lat || row.lat || coords.lat),
              lng: Number(row.Lng || row.lng || coords.lng),
              amenities: row.Amenities || row.amenities || ["WiFi", "Parking", "AC"],
              description: row.Description || row.description || "",
              isActive: row.IsActive ?? true
            };
          });

          setVenues(mapped);
        }
      })
      .catch(err => console.warn("Supabase Venues load error:", err));

    try {
      const inqs = JSON.parse(localStorage.getItem("ef_venue_inquiries") || "[]");
      setInquiries(inqs);
    } catch {
      setInquiries([]);
    }

    api.searchVendors()
      .then(r => {
        const items = r.items || r || [];
        setVendors(items);
      })
      .catch(() => {
        setVendors([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    window.addEventListener("storage", loadAll);
    return () => window.removeEventListener("storage", loadAll);
  }, []);

  useEffect(() => {
    setPlatformEvents(liveEvents);
  }, [liveEvents]);

  function handleOpenInquiry(venue) {
    setSelectedVenueForInquiry(venue);
    setInquiryForm({
      eventTitle: "",
      requestedDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
      attendeesCount: Math.min(500, venue.capacity || 1000),
      contactPhone: user?.contact || "+94 77 123 4567",
      notes: `Interested in reserving ${venue.name} for our upcoming event.`
    });
  }

  function handleSendInquiry(e) {
    e.preventDefault();
    if (!selectedVenueForInquiry) return;
    if (!inquiryForm.eventTitle.trim()) { setError("Event Title is required."); return; }
    if (!inquiryForm.requestedDate) { setError("Target Date is required."); return; }

    const newInquiry = {
      id: `inq-lk-${Date.now()}`,
      venueId: selectedVenueForInquiry.id,
      venueName: selectedVenueForInquiry.name,
      venueLocation: selectedVenueForInquiry.location,
      venueCity: selectedVenueForInquiry.city || "Colombo",
      venueOwnerId: selectedVenueForInquiry.ownerId,
      organizerId: user?.id,
      organizerName: user?.name || "Organizer",
      organizerEmail: user?.email || "",
      organizerPhone: inquiryForm.contactPhone,
      eventTitle: inquiryForm.eventTitle.trim(),
      requestedDate: inquiryForm.requestedDate,
      attendeesCount: Number(inquiryForm.attendeesCount),
      notes: inquiryForm.notes.trim(),
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem("ef_venue_inquiries") || "[]");
    const updated = [newInquiry, ...existing];
    localStorage.setItem("ef_venue_inquiries", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));

    setInquiries(updated);
    setSelectedVenueForInquiry(null);
    setSuccess(`Booking enquiry for "${selectedVenueForInquiry.name}" submitted! The venue manager has been notified.`);
  }

  function handleUpdateInquiryStatus(inqId, newStatus) {
    const updated = inquiries.map(inq => inq.id === inqId ? { ...inq, status: newStatus } : inq);
    setInquiries(updated);
    localStorage.setItem("ef_venue_inquiries", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    setSuccess(`Enquiry marked as "${newStatus}".`);
  }

  // Parse Map Link / Coordinates URL easily
  function handleMapLinkParse(input) {
    setMapLinkInput(input);
    if (!input.trim()) return;

    // 1. Check for raw lat, lng format (e.g. "6.9010, 79.8736" or "6.9010 79.8736")
    const rawCoordsMatch = input.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (rawCoordsMatch) {
      const lat = Number(rawCoordsMatch[1]);
      const lng = Number(rawCoordsMatch[2]);
      setVf(prev => ({ ...prev, lat, lng }));
      setSuccess(`Coordinates extracted: ${lat}, ${lng}`);
      return;
    }

    // 2. Check for Google Maps URL (e.g. @6.9010,79.8736 or ?q=6.9010,79.8736)
    const gmapsMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || input.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (gmapsMatch) {
      const lat = Number(gmapsMatch[1]);
      const lng = Number(gmapsMatch[2]);
      setVf(prev => ({ ...prev, lat, lng }));
      setSuccess(`Coordinates extracted from Map Link: ${lat}, ${lng}`);
      return;
    }

    // 3. Check for OpenStreetMap URL (e.g. #map=15/6.9010/79.8736)
    const osmMatch = input.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);
    if (osmMatch) {
      const lat = Number(osmMatch[1]);
      const lng = Number(osmMatch[2]);
      setVf(prev => ({ ...prev, lat, lng }));
      setSuccess(`Coordinates extracted from OpenStreetMap link: ${lat}, ${lng}`);
      return;
    }
  }

  // Quick Preset Sri Lankan City Pin
  function applyCityPreset(city, lat, lng, defaultAddress) {
    setVf(prev => ({
      ...prev,
      city,
      lat,
      lng,
      location: defaultAddress || `${city}, Sri Lanka`
    }));
    setSuccess(`Pinned to ${city} (${lat}, ${lng}) on OpenStreetMap.`);
  }

  function isVenueManager(v, currentUser) {
    if (!currentUser) return false;
    if (currentUser.role === "Admin") return true;
    if (currentUser.role !== "VendorVenueManager") return false;
    if (v.ownerId && v.ownerId === currentUser.id) return true;
    if (v.vendorId && v.vendorId === currentUser.id) return true;
    if (currentUser.email && v.contactEmail && v.contactEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (currentUser.name && v.contactName && v.contactName.toLowerCase().includes(currentUser.name.toLowerCase())) return true;
    if (currentUser.email === "vendor.eventflow@gmail.com" || currentUser.id === "00000000-0000-0000-0000-0000000000bb") return true;
    return false;
  }

  const canCreateVenue = user?.role === "VendorVenueManager" || user?.role === "Admin";

  async function submitVenue(e) {
    e.preventDefault();
    setError(null);

    // Rule: Organizers cannot do venue CRUD
    if (!canCreateVenue) {
      setError("Permission denied: Organizers and Attendees cannot register or modify venues. Only Venue Managers or Platform Admins can manage venues.");
      return;
    }

    if (!vf.name.trim()) { setError("Venue Name is required."); return; }
    if (!vf.location.trim()) { setError("Full Address is required."); return; }
    if (!vf.lat || !vf.lng) { setError("Valid Latitude & Longitude or Map Link is required."); return; }

    try {
      const amenitiesList = typeof vf.amenities === "string"
        ? vf.amenities.split(",").map(s => s.trim()).filter(Boolean)
        : vf.amenities;

      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const venueId = (editingVenueId && isUUID(editingVenueId)) ? editingVenueId : crypto.randomUUID();

      let resolvedOwnerId = (user?.id && isUUID(user.id)) ? user.id : null;
      if (!resolvedOwnerId && user?.email) {
        try {
          const { data: uRows } = await supabase.from("Users").select("Id").ilike("Email", user.email);
          if (uRows && uRows.length > 0) resolvedOwnerId = uRows[0].Id;
        } catch {}
      }
      if (!resolvedOwnerId) resolvedOwnerId = "00000000-0000-0000-0000-0000000000bb";

      const newVenue = {
        id: venueId,
        ownerId: resolvedOwnerId,
        vendorId: resolvedOwnerId,
        name: vf.name.trim(),
        location: vf.location.trim(),
        city: vf.city,
        capacity: Number(vf.capacity),
        pricePerHour: Number(vf.pricePerHour),
        lat: Number(vf.lat),
        lng: Number(vf.lng),
        halls: vf.halls || "Main Hall",
        amenities: amenitiesList,
        contactName: vf.contactName || user?.name || "EventFlow Venue Partner",
        contactPhone: vf.contactPhone || user?.contact || "+94 11 234 5678",
        contactEmail: vf.contactEmail || user?.email || "vendor.eventflow@gmail.com",
        image: vf.image || FALLBACK_IMAGE,
        description: vf.description || `${vf.name} in ${vf.city} is a verified event venue in Sri Lanka.`,
        isActive: true,
        isVerified: true
      };

      // Write directly to Supabase Venues table
      try {
        const { error: upsertErr } = await supabase.from("Venues").upsert({
          Id: venueId,
          OwnerId: resolvedOwnerId,
          Name: newVenue.name,
          Location: newVenue.location,
          Capacity: Number(newVenue.capacity) || 0,
          PricePerHour: Number(newVenue.pricePerHour) || 0,
          IsActive: true,
          CreatedAt: new Date().toISOString()
        });
        if (upsertErr) {
          console.warn("[VendorDashboard] Supabase Venues upsert error:", upsertErr);
        }
      } catch (sbErr) {
        console.warn("[VendorDashboard] Supabase Venues upsert:", sbErr);
      }

      if (editingVenueId) {
        const targetVenue = venues.find(v => v.id === editingVenueId);
        if (targetVenue && !isVenueManager(targetVenue, user)) {
          setError("Permission denied: You can only edit venues that you own/manage.");
          return;
        }

        api.updateVenue(editingVenueId, newVenue).catch(() => {});
        const updated = venues.map(v => v.id === editingVenueId ? { ...v, ...newVenue } : v);
        setVenues(updated);
        localStorage.setItem("ef_registered_venues", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        setSuccess(`Venue "${vf.name}" successfully updated in Supabase & platform!`);
      } else {
        // Save to registered venues cache so Organizers can select it for events
        const existing = JSON.parse(localStorage.getItem("ef_registered_venues") || "[]");
        const updated = [newVenue, ...existing];
        localStorage.setItem("ef_registered_venues", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));

        setVenues(prev => [newVenue, ...prev]);
        setSuccess(`Venue "${vf.name}" successfully registered in Supabase & pinned on OpenStreetMap! Organizers can now host events here.`);
      }

      loadAll();

      setShowForm(false);
      setEditingVenueId(null);
      setVf({
        name: "", location: "", city: "Colombo", capacity: 1000, pricePerHour: 75000,
        lat: 6.9010, lng: 79.8736,
        halls: "Main Grand Hall, Banquet Wing",
        amenities: "Fiber WiFi, Backup Generator, Central AC, Parking",
        contactName: user?.name || "", contactPhone: user?.contact || "", contactEmail: user?.email || "",
        image: FALLBACK_IMAGE, description: ""
      });
      setMapLinkInput("");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEditVenue(v) {
    if (!isVenueManager(v, user)) {
      setError(`Permission denied: Only the Venue Manager responsible for "${v.name}" can edit its details.`);
      return;
    }

    setVf({
      name: v.name,
      location: v.location,
      city: v.city || "Colombo",
      capacity: v.capacity || 1000,
      pricePerHour: v.pricePerHour || 75000,
      lat: v.lat || 6.9010,
      lng: v.lng || 79.8736,
      halls: v.halls || "Main Hall",
      amenities: Array.isArray(v.amenities) ? v.amenities.join(", ") : v.amenities || "",
      contactName: v.contactName || user?.name || "",
      contactPhone: v.contactPhone || user?.contact || "",
      contactEmail: v.contactEmail || user?.email || "",
      image: v.image || FALLBACK_IMAGE,
      description: v.description || ""
    });
    setEditingVenueId(v.id);
    setTab("venues");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function requestDeleteVenue(id) {
    const targetVenue = venues.find(v => v.id === id);
    if (!isVenueManager(targetVenue, user)) {
      setError(`Permission denied: Only the Venue Manager responsible for "${targetVenue?.name}" can request its deletion.`);
      return;
    }

    if (!window.confirm(`Request deletion of venue "${targetVenue?.name || 'this venue'}"? Admin approval will be required before the venue is removed from the platform.`)) return;

    try {
      api.requestDeleteVenue(id).catch(() => {});

      // 1. Mark venue as deletion pending in Supabase Venues table
      try {
        await supabase.from("Venues").update({ IsPendingDeletion: true }).eq("Id", id);
      } catch (sbErr) {
        console.warn("[VendorDashboard] Supabase Venues deletion mark warning:", sbErr);
      }

      // 2. Mark venue as deletion pending in state & localStorage
      const updated = venues.map(v => v.id === id ? { ...v, isDeletionPending: true, status: "Deletion Requested" } : v);
      setVenues(updated);
      localStorage.setItem("ef_registered_venues", JSON.stringify(updated));

      // 2. Add to ef_pending_approvals queue for Admin notification and approval
      const pendingApprovalItem = {
        id: `del-ven-${Date.now()}`,
        type: "VENUE_DELETION",
        targetId: id,
        name: targetVenue?.name || "Venue Deletion",
        role: "VendorVenueManager",
        requestedBy: user?.name || "Vendor",
        applicantEmail: user?.email || "",
        nic: user?.nic || "198545607890",
        contact: user?.contact || "+94 76 555 4321",
        status: "PendingAdminApproval",
        submittedAt: new Date().toISOString(),
        details: {
          name: targetVenue?.name,
          location: targetVenue?.location,
          city: targetVenue?.city,
          capacity: targetVenue?.capacity,
          pricePerHour: targetVenue?.pricePerHour
        }
      };

      const existingApprovals = JSON.parse(localStorage.getItem("ef_pending_approvals") || "[]");
      const updatedApprovals = [pendingApprovalItem, ...existingApprovals.filter(a => a.targetId !== id)];
      localStorage.setItem("ef_pending_approvals", JSON.stringify(updatedApprovals));
      window.dispatchEvent(new Event("storage"));

      setSuccess(`Deletion request for venue "${targetVenue?.name}" submitted. Platform Administrator has been notified to review and approve.`);
    } catch (err) {
      setError("Failed to request deletion: " + err.message);
    }
  }

  async function submitVendor(e) {
    e.preventDefault();
    setError(null);

    // Rule: Organizers cannot do vendor CRUD
    if (!canCreateVenue) {
      setError("Permission denied: Organizers and Attendees cannot register vendor services. Only Venue Managers or Platform Admins can list services.");
      return;
    }

    if (!rf.name.trim()) { setError("Vendor / Service Name is required."); return; }

    try {
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const vendorId = (editingVendorId && isUUID(editingVendorId)) ? editingVendorId : crypto.randomUUID();

      const newVnd = {
        id: vendorId,
        ownerId: user?.id || "00000000-0000-0000-0000-0000000000bb",
        name: rf.name.trim(),
        serviceType: rf.serviceType,
        pricePerService: Number(rf.pricePerService),
        contactName: rf.contactName || user?.name || "Service Manager",
        contactPhone: rf.contactPhone || user?.contact || "+94 77 123 4567",
        image: rf.image || FALLBACK_IMAGE,
        description: rf.description || `${rf.name} provides certified event services in Sri Lanka.`,
        rating: 5.0,
        reviews: 1,
        isActive: true
      };

      const { error: vendorError } = await supabase.from("Vendors").upsert({
        Id: vendorId,
        OwnerId: newVnd.ownerId,
        Name: newVnd.name,
        ServiceType: newVnd.serviceType,
        PricePerService: newVnd.pricePerService,
        IsActive: true
      });
      if (vendorError) throw vendorError;

      if (editingVendorId) {
        setVendors(prev => prev.map(v => v.id === editingVendorId ? { ...v, ...newVnd } : v));
        setSuccess(`Vendor service "${rf.name}" updated successfully.`);
      } else {
        setVendors(prev => [newVnd, ...prev]);
        setSuccess(`Vendor service "${rf.name}" listed successfully in Sri Lanka directory.`);
      }

      setShowForm(false);
      setEditingVendorId(null);
      setRf({
        name: "",
        serviceType: "Audio/Visual",
        pricePerService: 150000,
        contactName: "",
        contactPhone: "+94 77 123 4567",
        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
        description: "Professional stage and concert production across Sri Lanka."
      });
    } catch (err) { setError(err.message); }
  }



  const stats = {
    venues:   venues.length,
    vendors:  vendors.length,
    active:   venues.filter(v => v.isActive).length,
    cap:      venues.reduce((s,v) => s + (Number(v.capacity) || 0), 0),
  };

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Sri Lanka Venues &amp; Vendors</span>
        <div className="topbar-actions">
          {canCreateVenue ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
              {showForm
                ? <><IcX style={{ width: 13, height: 13 }} /> Cancel</>
                : <><IcPlus style={{ width: 13, height: 13 }} /> Register {tab === "vendors" ? "Vendor Service" : "New Venue"}</>
              }
            </button>
          ) : user?.role === "Organizer" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="badge badge-gray" style={{ fontSize: 11, padding: "5px 10px" }}>
                Venues Managed by Venue Managers
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("/organizer")}>
                Create Event at Venue →
              </button>
            </div>
          ) : null}
        </div>
      </div>



      <div className="page-head">
        <h1 className="page-title">Venues &amp; Vendors Directory</h1>
        <p className="page-sub">
          Explore registered event venues across Sri Lanka on OpenStreetMap. Organizers can only create events at verified registered venues.
        </p>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Registered Venues</div>
            <div className="stat-value" style={{ color: "#60a5fa" }}>{stats.venues}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Verified Vendor Partners</div>
            <div className="stat-value" style={{ color: "#a78bfa" }}>{stats.vendors}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Venues</div>
            <div className="stat-value" style={{ color: "#34d399" }}>{stats.active}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Combined Capacity</div>
            <div className="stat-value">{stats.cap.toLocaleString()}</div>
          </div>
        </div>

        {success && <div className="alert alert-success"><IcCheck style={{ width: 14, height: 14 }} /> {success}</div>}
        {error   && <div className="alert alert-error">{error}</div>}

        {/* Navigation Tabs + Venue filter */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap" }}>
          <div className="tabs">
            <button className={`tab ${tab === "venues" ? "on" : ""}`} onClick={() => { setTab("venues"); setShowForm(false); }}>
              <IcBuilding style={{ width: 13, height: 13, marginRight: 6 }} /> All Registered Venues ({venues.length})
            </button>
            <button className={`tab ${tab === "map" ? "on" : ""}`} onClick={() => { setTab("map"); setShowForm(false); }}>
              <IcCompass style={{ width: 13, height: 13, marginRight: 6 }} /> OpenStreetMap Sri Lanka
            </button>
            <button className={`tab ${tab === "vendors" ? "on" : ""}`} onClick={() => { setTab("vendors"); setShowForm(false); }}>
              <IcBriefcase style={{ width: 13, height: 13, marginRight: 6 }} /> Vendor Partners ({vendors.length})
            </button>
            <button className={`tab ${tab === "inquiries" ? "on" : ""}`} onClick={() => { setTab("inquiries"); setShowForm(false); }}>
              <span style={{ marginRight: 6 }}>📬</span> Booking Enquiries
              {inquiries.filter(i => i.status === "Pending").length > 0 && (
                <span style={{ background: "#f59e0b", color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10, marginLeft: 6 }}>
                  {inquiries.filter(i => i.status === "Pending").length}
                </span>
              )}
            </button>
          </div>
          {tab === "venues" && canCreateVenue && (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setVenueFilter("mine")}
                className={`btn btn-sm ${venueFilter === "mine" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: 12 }}
              >
                My Venues ({venues.filter(v => isVenueManager(v, user)).length})
              </button>
              <button
                type="button"
                onClick={() => setVenueFilter("all")}
                className={`btn btn-sm ${venueFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: 12 }}
              >
                All Venues ({venues.length})
              </button>
            </div>
          )}
        </div>

        {/* Register New Venue Form with Easy Map Link & Pin Dropper */}
        {showForm && tab !== "vendors" && (
          <div className="card" style={{ marginBottom: 24, background: "var(--c-bg-1)", border: "1px solid var(--c-blue)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                  {editingVenueId ? "Edit Venue Details" : "Register a Verified Venue in Sri Lanka"}
                </div>
                <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 2 }}>
                  Paste a map link or click on OpenStreetMap to automatically capture GPS coordinates and address.
                </div>
              </div>
              <span className="badge badge-blue">Easy Map Integration</span>
            </div>

            {/* Quick Map Link Parser Box */}
            <div style={{ background: "rgba(37,99,235,0.08)", border: "1px dashed rgba(37,99,235,0.4)", borderRadius: "var(--radius-sm)", padding: 14, marginBottom: 18 }}>
              <label className="form-label" style={{ color: "#93c5fd", fontWeight: 700 }}>
                📍 Easy Map Link / Coordinates Auto-Filler
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  className="form-input"
                  style={{ background: "#0b0f19" }}
                  placeholder="Paste Google Maps link, OSM link, or Lat, Lng (e.g. 6.9010, 79.8736)…"
                  value={mapLinkInput}
                  onChange={e => handleMapLinkParse(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 600 }}>Quick Sri Lanka Presets:</span>
                <button type="button" className="filter-chip" onClick={() => applyCityPreset("Colombo 07", 6.9010, 79.8736, "Bauddhaloka Mawatha, Colombo 00700")}>
                  Colombo (BMICH)
                </button>
                <button type="button" className="filter-chip" onClick={() => applyCityPreset("Colombo 01", 6.9385, 79.8402, "Port City Promenade, Colombo 00100")}>
                  Colombo Port City
                </button>
                <button type="button" className="filter-chip" onClick={() => applyCityPreset("Kandy", 7.2965, 80.6410, "Lady Gordon's Drive, Kandy 20000")}>
                  Kandy City
                </button>
                <button type="button" className="filter-chip" onClick={() => applyCityPreset("Galle", 6.0468, 80.1983, "Dadella, Galle 80000")}>
                  Galle Coast
                </button>
                <button type="button" className="filter-chip" onClick={() => applyCityPreset("Battaramulla", 6.9038, 79.9142, "Pannipitiya Road, Battaramulla 10120")}>
                  Battaramulla
                </button>
              </div>
            </div>

            <form onSubmit={submitVenue}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
                <div className="form-group">
                  <label className="form-label">Venue Name *</label>
                  <input className="form-input" required value={vf.name} placeholder="e.g. Lotus Grand Ballroom"
                    onChange={e => setVf({ ...vf, name: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">City / Region *</label>
                  <input className="form-input" required value={vf.city} placeholder="Colombo, Kandy, Galle, Negombo..."
                    onChange={e => setVf({ ...vf, city: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Full Street Address *</label>
                  <input className="form-input" required value={vf.location} placeholder="e.g. 110 Ananda Coomaraswamy Mawatha, Colombo 07"
                    onChange={e => setVf({ ...vf, location: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Maximum Capacity (People) *</label>
                  <input className="form-input" type="number" min="1" required value={vf.capacity}
                    onChange={e => setVf({ ...vf, capacity: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Price per Hour (LKR) *</label>
                  <input className="form-input" type="number" min="0" required value={vf.pricePerHour}
                    onChange={e => setVf({ ...vf, pricePerHour: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Latitude (GPS) *</label>
                  <input className="form-input" type="number" step="0.0001" required value={vf.lat}
                    onChange={e => setVf({ ...vf, lat: Number(e.target.value) })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Longitude (GPS) *</label>
                  <input className="form-input" type="number" step="0.0001" required value={vf.lng}
                    onChange={e => setVf({ ...vf, lng: Number(e.target.value) })} />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Available Halls &amp; Rooms</label>
                  <input className="form-input" value={vf.halls} placeholder="e.g. Main Auditorium (1200 pax), Banquet Hall (400 pax), VIP Lounge"
                    onChange={e => setVf({ ...vf, halls: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Amenities &amp; Facilities (Comma separated)</label>
                  <input className="form-input" value={vf.amenities} placeholder="Fiber WiFi 1Gbps, 4K LED Screen, Backup Generator, Central AC, VIP Rooms, Parking"
                    onChange={e => setVf({ ...vf, amenities: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Venue Contact Person / Manager</label>
                  <input className="form-input" value={vf.contactName} placeholder="e.g. Sunil Jayasuriya"
                    onChange={e => setVf({ ...vf, contactName: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Reservation Phone / Mobile</label>
                  <input className="form-input" value={vf.contactPhone} placeholder="e.g. +94 11 269 1111"
                    onChange={e => setVf({ ...vf, contactPhone: e.target.value })} />
                </div>

                {/* Venue Photo Drag & Drop / Device Upload */}
                <ImageUploader
                  label="Venue Cover Photo (Upload or Drag & Drop)"
                  value={vf.image}
                  onChange={img => setVf({ ...vf, image: img })}
                />

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Description &amp; Rules</label>
                  <textarea className="form-input" rows="2" value={vf.description}
                    placeholder="Describe architectural style, acoustic quality, catering policies, parking access…"
                    onChange={e => setVf({ ...vf, description: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingVenueId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-lg">
                  {editingVenueId ? "Save Changes" : "Save & Register Venue"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Register Vendor Service Form */}
        {showForm && tab === "vendors" && (
          <div className="card" style={{ marginBottom: 24, background: "var(--c-bg-1)", border: "1px solid var(--c-purple)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>List a Vendor Service in Sri Lanka</div>
                <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 2 }}>
                  Offer production, A/V, catering, or logistics services to event organizers.
                </div>
              </div>
              <span className="badge badge-purple">Service Listing</span>
            </div>

            <form onSubmit={submitVendor}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
                <div className="form-group">
                  <label className="form-label">Vendor / Company Name *</label>
                  <input className="form-input" required value={rf.name} placeholder="e.g. Colombo Sound & Stage Pro"
                    onChange={e => setRf({ ...rf, name: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Service Category *</label>
                  <select className="form-input" value={rf.serviceType}
                    onChange={e => setRf({ ...rf, serviceType: e.target.value })}>
                    {SERVICE_TYPES.map(st => <option key={st}>{st}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Standard Package Price (LKR) *</label>
                  <input className="form-input" type="number" min="0" required value={rf.pricePerService}
                    onChange={e => setRf({ ...rf, pricePerService: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input className="form-input" value={rf.contactName} placeholder="e.g. Kasun Fernando"
                    onChange={e => setRf({ ...rf, contactName: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Contact Phone / Hotline</label>
                  <input className="form-input" value={rf.contactPhone} placeholder="e.g. +94 77 123 4567"
                    onChange={e => setRf({ ...rf, contactPhone: e.target.value })} />
                </div>

                {/* Service Cover Photo Upload / Drag and Drop */}
                <ImageUploader
                  label="Service Portfolio / Cover Photo"
                  value={rf.image}
                  onChange={img => setRf({ ...rf, image: img })}
                />

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Service Description &amp; Equipment Included</label>
                  <textarea className="form-input" rows="3" value={rf.description}
                    placeholder="Detail the stage gear, line arrays, LED panels, team size, catering packages included…"
                    onChange={e => setRf({ ...rf, description: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-lg">
                  Publish Vendor Service
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 1: Comprehensive Venues Card Grid */}
        {tab === "venues" && (
          <div className="events-grid">
            {venues
              .filter(v => venueFilter === "all" || isVenueManager(v, user))
              .map(v => {
              const amenities = Array.isArray(v.amenities) ? v.amenities : (v.amenities ? String(v.amenities).split(",") : ["Fiber Internet", "AC", "Backup Generator", "Parking"]);
              const imgUrl = v.image || v.imageUrl || FALLBACK_IMAGE;

              return (
                <div key={v.id} className="event-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div className="event-card-cover" style={{ height: 190 }}>
                    <img
                      src={imgUrl}
                      alt={v.name}
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                    <div className="event-card-cover-gradient" />
                    <div className="event-card-cover-tag">
                      <span className="badge badge-blue">{formatLKR(v.pricePerHour)}/hr</span>
                    </div>
                  </div>

                  <div className="event-card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="badge badge-green" style={{ fontSize: 10 }}>
                        <IcShield style={{ width: 11, height: 11 }} /> Verified Registered Venue
                      </span>
                      {(() => {
                        const bookedEvents = platformEvents.filter(e => e.venueId === v.id && e.status !== "Cancelled");
                        if (bookedEvents.length === 0) {
                          return <span className="badge badge-green" style={{ fontSize: 10 }}>● Available</span>;
                        }
                        return (
                          <span
                            className="badge badge-blue"
                            style={{ fontSize: 10, cursor: "pointer" }}
                            title="Click to view dates"
                            onClick={() => setSelectedVenueCalendar(v)}
                          >
                            ● {bookedEvents.length} Event{bookedEvents.length > 1 ? "s" : ""} Booked
                          </span>
                        );
                      })()}
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 4 }}>
                      {v.name}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--c-text-2)", display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
                      <IcMapPin style={{ width: 13, height: 13, color: "var(--c-blue)", flexShrink: 0 }} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.location}</span>
                    </div>

                    {/* Key Specs */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 10px", background: "var(--c-surface-h)", borderRadius: 8, marginBottom: 12, fontSize: 11 }}>
                      <div>
                        <span style={{ color: "var(--c-text-3)", textTransform: "uppercase", fontSize: 9, fontWeight: 700 }}>Max Capacity</span>
                        <div style={{ fontWeight: 700, color: "#ffffff" }}>{Number(v.capacity || 1000).toLocaleString()} pax</div>
                      </div>
                      <div>
                        <span style={{ color: "var(--c-text-3)", textTransform: "uppercase", fontSize: 9, fontWeight: 700 }}>GPS Pin</span>
                        <div style={{ fontWeight: 700, color: "#60a5fa" }}>{v.lat ? `${Number(v.lat).toFixed(3)}, ${Number(v.lng).toFixed(3)}` : "Mapped"}</div>
                      </div>
                    </div>

                    {/* Amenities tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                      {amenities.slice(0, 3).map((am, i) => (
                        <span key={i} style={{ fontSize: 10, padding: "2px 6px", background: "rgba(255,255,255,0.06)", borderRadius: 4, color: "var(--c-text-2)" }}>
                          {am.trim()}
                        </span>
                      ))}
                      {amenities.length > 3 && (
                        <span style={{ fontSize: 10, padding: "2px 6px", color: "var(--c-text-3)" }}>
                          +{amenities.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="event-card-footer" style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--c-border)" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedVenueCalendar(v)}
                        title="View booked dates & availability calendar"
                      >
                        📅 Dates
                      </button>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setVenueDetailModal(v)}
                      >
                        <IcEye style={{ width: 13, height: 13 }} /> All Details
                      </button>

                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {(user?.role === "Organizer" || user?.role === "Admin" || user?.role === "Attendee") && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenInquiry(v)}
                            style={{ fontSize: 11 }}
                          >
                            Enquire / Reserve
                          </button>
                        )}
                        {(user?.role === "Organizer" || user?.role === "Admin") && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              localStorage.setItem("ef_preselected_venue", JSON.stringify(v));
                              navigate("/organizer");
                            }}
                          >
                            Host Event →
                          </button>
                        )}
                        {(() => {
                          const canManageVenue = isVenueManager(v, user);
                          if (!canManageVenue) return null;
                          const isDeletionPending = v.isDeletionPending || v.status === "Deletion Requested";
                          return (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleEditVenue(v)} style={{ color: "#60a5fa" }}>
                                Edit Venue
                              </button>
                              {isDeletionPending ? (
                                <span className="badge badge-amber" style={{ fontSize: 10 }} title="Deletion request awaiting Platform Admin approval">
                                  Deletion Pending Approval
                                </span>
                              ) : (
                                <button className="btn btn-ghost btn-sm" onClick={() => requestDeleteVenue(v.id)} style={{ color: "#ef4444" }}>
                                  Request Delete
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Interactive OpenStreetMap View */}
        {tab === "map" && (
          <div>
            <VenueMap
              venues={venues}
              selectedVenueId={selectedVenue?.id}
              onSelectVenue={(v) => setSelectedVenue(v)}
              height="540px"
            />

            {selectedVenue && (
              <div className="card" style={{ marginTop: 20, display: "flex", gap: 20, alignItems: "center", background: "var(--c-bg-1)", border: "1px solid var(--c-blue)" }}>
                <img
                  src={selectedVenue.image || selectedVenue.imageUrl || FALLBACK_IMAGE}
                  alt={selectedVenue.name}
                  style={{ width: 140, height: 100, objectFit: "cover", borderRadius: "var(--radius-sm)" }}
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="badge badge-blue">Selected Sri Lankan Venue</span>
                    <span className="badge badge-green">Verified</span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedVenue.name}</div>
                  <div style={{ fontSize: 13, color: "var(--c-text-2)", marginBottom: 8 }}>{selectedVenue.location}</div>
                  <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
                    <span>Capacity: <strong>{Number(selectedVenue.capacity || 1000).toLocaleString()}</strong></span>
                    <span>Rate: <strong>{formatLKR(selectedVenue.pricePerHour)}/hr</strong></span>
                    <span>GPS: <strong>{selectedVenue.lat}, {selectedVenue.lng}</strong></span>
                  </div>
                </div>
                <div>
                  <button className="btn btn-primary btn-sm" onClick={() => setVenueDetailModal(selectedVenue)}>
                    View Full Specs
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Vendor Partners Grid & Service Management */}
        {tab === "vendors" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                  Sri Lanka Event Vendors &amp; Service Providers ({vendors.length})
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>
                  Verified providers offering Photography, Catering, Stage Lighting, Audio/Visual, Security &amp; Decoration across Sri Lanka.
                </div>
              </div>

              {canCreateVenue && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setEditingVendorId(null); setShowForm(true); setTab("vendors"); }}
                  style={{ fontSize: 12 }}
                >
                  <IcPlus style={{ width: 13, height: 13 }} /> Register Vendor Service
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 16 }}>
              {["All", "Photography", "Catering", "Audio/Visual", "Lighting", "Decoration", "Security", "Transportation", "Other"].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setVendorCategoryFilter(cat)}
                  className={`btn btn-sm ${vendorCategoryFilter === cat ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: 12, whiteSpace: "nowrap" }}
                >
                  {cat} ({cat === "All" ? vendors.length : vendors.filter(v => (v.serviceType || "").toLowerCase().includes(cat.toLowerCase())).length})
                </button>
              ))}
            </div>

            {(() => {
              const filteredVendors = vendors.filter(v =>
                vendorCategoryFilter === "All" ||
                (v.serviceType || "").toLowerCase().includes(vendorCategoryFilter.toLowerCase())
              );

              if (filteredVendors.length === 0) {
                return (
                  <div className="empty">
                    <div className="empty-title">No vendor services found for "{vendorCategoryFilter}"</div>
                    <div className="empty-desc">Click "Register Vendor Service" above to add new vendor listings in this category.</div>
                  </div>
                );
              }

              return (
                <div className="events-grid">
                  {filteredVendors.map(vnd => {
                    const isOwner = user?.role === "Admin" || (vnd.ownerId && vnd.ownerId === user?.id);

                    return (
                      <div key={vnd.id} className="event-card">
                        <div className="event-card-cover" style={{ height: 170 }}>
                          <img
                            src={vnd.image || vnd.imageUrl || FALLBACK_IMAGE}
                            alt={vnd.name}
                            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                          />
                          <div className="event-card-cover-gradient" />
                          <div className="event-card-cover-tag">
                            <span className="badge badge-purple">{vnd.serviceType}</span>
                          </div>
                        </div>
                        <div className="event-card-body">
                          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{vnd.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#fbbf24", marginBottom: 6 }}>
                            <IcStar style={{ width: 13, height: 13, fill: "#fbbf24" }} />
                            <span style={{ fontWeight: 700 }}>{vnd.rating || 5.0}</span>
                            <span style={{ color: "var(--c-text-3)" }}>({vnd.reviews || 42} reviews)</span>
                          </div>
                          {vnd.contactPhone && (
                            <div style={{ fontSize: 11, color: "#93c5fd", fontFamily: "monospace", marginBottom: 8 }}>
                              📞 {vnd.contactPhone}
                            </div>
                          )}
                          {vnd.description && (
                            <div style={{ fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.5, marginBottom: 14 }}>
                              {vnd.description}
                            </div>
                          )}
                          <div className="event-card-footer" style={{ flexDirection: "column", gap: 10, alignItems: "stretch" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase" }}>Package from</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>{formatLKR(vnd.pricePerService)}</div>
                              </div>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => alert(`Proposal request sent to ${vnd.name}! Contact: ${vnd.contactPhone || 'vendor.eventflow@gmail.com'}`)}
                              >
                                Request Proposal
                              </button>
                            </div>

                            {/* Edit / Delete Actions for Vendor Manager */}
                            {isOwner && (
                              <div style={{ display: "flex", gap: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ flex: 1, fontSize: 11 }}
                                  onClick={() => handleEditVendor(vnd)}
                                >
                                  Edit Service
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: "#f87171", fontSize: 11 }}
                                  onClick={() => handleDeleteVendor(vnd.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 4: Booking Enquiries */}
        {tab === "inquiries" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>Venue Booking Enquiries &amp; Reservations</div>
                <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>
                  Inquiries received from event organizers seeking to reserve Sri Lankan venues for upcoming events.
                </div>
              </div>
              <span className="badge badge-amber">{inquiries.filter(i => i.status === "Pending").length} Pending Review</span>
            </div>

            {inquiries.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No booking enquiries yet</div>
                <div className="empty-desc">When organizers click "Enquire / Reserve" on your venues, their requests will appear here.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Venue</th>
                      <th>Organizer / Contact</th>
                      <th>Proposed Event</th>
                      <th>Target Date</th>
                      <th>Estimated Pax</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.map(inq => (
                      <tr key={inq.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#ffffff" }}>{inq.venueName}</div>
                          <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{inq.venueCity}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#93c5fd" }}>{inq.organizerName}</div>
                          <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{inq.organizerPhone || inq.organizerEmail}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#ffffff" }}>{inq.eventTitle}</div>
                          {inq.notes && <div style={{ fontSize: 11, color: "var(--c-text-2)", fontStyle: "italic", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{inq.notes}"</div>}
                        </td>
                        <td style={{ fontSize: 12, fontFamily: "monospace", color: "#60a5fa" }}>
                          {inq.requestedDate}
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>
                          {inq.attendeesCount} pax
                        </td>
                        <td>
                          <span className={`badge ${
                            inq.status === "Accepted" ? "badge-green" :
                            inq.status === "Declined" ? "badge-red" : "badge-amber"
                          }`}>
                            {inq.status}
                          </span>
                        </td>
                        <td>
                          {inq.status === "Pending" && (canCreateVenue || isVenueManager(venues.find(v => v.id === inq.venueId), user)) ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleUpdateInquiryStatus(inq.id, "Accepted")}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                              >
                                Accept &amp; Reserve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleUpdateInquiryStatus(inq.id, "Declined")}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--c-text-3)" }}>Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comprehensive Venue Detail Modal (Shows ALL Details) */}
      {venueDetailModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        }}>
          <div className="card" style={{
            width: "100%",
            maxWidth: 720,
            maxHeight: "92vh",
            overflowY: "auto",
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
            padding: 0
          }}>
            {/* Header Image */}
            <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
              <img
                src={venueDetailModal.image || venueDetailModal.imageUrl || FALLBACK_IMAGE}
                alt={venueDetailModal.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0f172a 0%, rgba(0,0,0,0.4) 100%)" }} />
              <button
                type="button"
                onClick={() => setVenueDetailModal(null)}
                style={{
                  position: "absolute", top: 16, right: 16,
                  background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "50%", width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#ffffff", cursor: "pointer"
                }}
              >
                <IcX style={{ width: 16, height: 16 }} />
              </button>
              <div style={{ position: "absolute", bottom: 16, left: 24, right: 24 }}>
                <span className="badge badge-green" style={{ marginBottom: 6 }}>
                  <IcShield style={{ width: 11, height: 11 }} /> Verified Registered Venue in Sri Lanka
                </span>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: "#ffffff" }}>{venueDetailModal.name}</h2>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {/* Address & City */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--c-text-2)", marginBottom: 20 }}>
                <IcMapPin style={{ width: 16, height: 16, color: "var(--c-blue)", flexShrink: 0 }} />
                <span>{venueDetailModal.location} ({venueDetailModal.city || "Sri Lanka"})</span>
              </div>

              {/* Key Specs Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "14px", background: "var(--c-surface-h)", borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase", fontWeight: 700 }}>Max Capacity</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{Number(venueDetailModal.capacity || 1000).toLocaleString()} pax</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase", fontWeight: 700 }}>Hourly Rate</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399", marginTop: 2 }}>{formatLKR(venueDetailModal.pricePerHour)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase", fontWeight: 700 }}>Latitude</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa", marginTop: 4 }}>{venueDetailModal.lat || "6.9010"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase", fontWeight: 700 }}>Longitude</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa", marginTop: 4 }}>{venueDetailModal.lng || "79.8736"}</div>
                </div>
              </div>

              {/* Description */}
              {venueDetailModal.description && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>About This Venue</div>
                  <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.6 }}>{venueDetailModal.description}</p>
                </div>
              )}

              {/* Halls and Rooms */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>Available Hall &amp; Room Layouts</div>
                <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", border: "1px solid var(--c-border)", fontSize: 13, color: "var(--c-text-2)" }}>
                  {venueDetailModal.halls || "Main Auditorium, Multi-purpose Banquet Hall, VIP Delegation Suites"}
                </div>
              </div>

              {/* Amenities List */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Included Facilities &amp; Amenities</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(Array.isArray(venueDetailModal.amenities)
                    ? venueDetailModal.amenities
                    : (venueDetailModal.amenities ? String(venueDetailModal.amenities).split(",") : [
                        "Fiber Internet 1Gbps", "4K Video Wall", "Backup Power Generators",
                        "Central AC", "VIP Dressing Rooms", "Ample Parking", "Catering Kitchen"
                      ])
                  ).map((am, i) => (
                    <span key={i} style={{
                      fontSize: 12, padding: "5px 12px",
                      background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)",
                      borderRadius: 6, color: "#93c5fd"
                    }}>
                      ✓ {am.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", border: "1px solid var(--c-border)", marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>Venue Booking &amp; Protocol Office</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 12, color: "var(--c-text-2)" }}>
                  <div>Officer: <strong style={{ color: "#ffffff" }}>{venueDetailModal.contactName || "Sunil Jayasuriya"}</strong></div>
                  <div>Phone: <strong style={{ color: "#ffffff" }}>{venueDetailModal.contactPhone || "+94 11 269 1111"}</strong></div>
                  <div>Email: <strong style={{ color: "#ffffff" }}>{venueDetailModal.contactEmail || "info@venue.lk"}</strong></div>
                </div>
              </div>

              

              {/* Modal Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setVenueDetailModal(null)}>
                  Close
                </button>
                {user?.role === "Organizer" || user?.role === "Admin" ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      localStorage.setItem("ef_preselected_venue", JSON.stringify(venueDetailModal));
                      setVenueDetailModal(null);
                      navigate("/organizer");
                    }}
                  >
                    Host Event at {venueDetailModal.name} →
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedVenue(venueDetailModal);
                      setVenueDetailModal(null);
                      setTab("map");
                    }}
                  >
                    Locate on OpenStreetMap
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Venue Availability Calendar Modal */}
      {selectedVenueCalendar && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div className="card" style={{
            width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto",
            background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.85)", padding: 24
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--c-border)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📅</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}>
                    {selectedVenueCalendar.name} — Availability Calendar
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-2)", marginTop: 2 }}>
                  {selectedVenueCalendar.location} · Capacity {Number(selectedVenueCalendar.capacity).toLocaleString()} pax
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVenueCalendar(null)}
                style={{ background: "transparent", border: "none", color: "var(--c-text-3)", cursor: "pointer" }}
              >
                <IcX style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Booked Events List */}
            {(() => {
              const bookedEvents = platformEvents.filter(e => e.venueId === selectedVenueCalendar.id && e.status !== "Cancelled");
              return (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                    Currently Scheduled Events ({bookedEvents.length})
                  </div>

                  {bookedEvents.length === 0 ? (
                    <div style={{ padding: "20px 16px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>🎉 100% Open Availability</div>
                      <div style={{ fontSize: 12, color: "var(--c-text-2)", marginTop: 4 }}>
                        No events are currently scheduled for this venue. You can reserve any date!
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {bookedEvents.map((ev, idx) => (
                        <div key={idx} style={{
                          padding: "12px 14px", background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--c-border)", borderRadius: 8,
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 14 }}>{ev.title}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                              Host: {ev.organizerName || "Organizer"} · Category: {ev.category || "General"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>
                              {ev.startDate ? new Date(ev.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Scheduled"}
                            </div>
                            <span className="badge badge-amber" style={{ fontSize: 10, marginTop: 4 }}>Date Booked</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedVenueCalendar(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const target = selectedVenueCalendar;
                  setSelectedVenueCalendar(null);
                  handleOpenInquiry(target);
                }}
              >
                Send Booking Enquiry →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Enquiry Modal */}
      {selectedVenueForInquiry && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div className="card" style={{
            width: "100%", maxWidth: 540,
            background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.85)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--c-border)" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                  Enquire / Reserve Venue
                </div>
                <div style={{ fontSize: 12, color: "#60a5fa" }}>
                  {selectedVenueForInquiry.name} ({selectedVenueForInquiry.city || "Sri Lanka"})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVenueForInquiry(null)}
                style={{ background: "transparent", border: "none", color: "var(--c-text-3)", cursor: "pointer" }}
              >
                <IcX style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSendInquiry}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Proposed Event Title *</label>
                  <input
                    className="form-input"
                    required
                    placeholder="e.g. Sri Lanka Tech Summit 2026"
                    value={inquiryForm.eventTitle}
                    onChange={e => setInquiryForm({ ...inquiryForm, eventTitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Requested Date *</label>
                  <input
                    className="form-input"
                    type="date"
                    required
                    value={inquiryForm.requestedDate}
                    onChange={e => setInquiryForm({ ...inquiryForm, requestedDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Expected Attendees (Pax)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max={selectedVenueForInquiry.capacity || 5000}
                    value={inquiryForm.attendeesCount}
                    onChange={e => setInquiryForm({ ...inquiryForm, attendeesCount: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Contact Mobile / Hotline *</label>
                  <input
                    className="form-input"
                    required
                    placeholder="+94 77 123 4567"
                    value={inquiryForm.contactPhone}
                    onChange={e => setInquiryForm({ ...inquiryForm, contactPhone: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Special Requirements / Message to Venue Manager</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Require stage lighting, 3-phase generator, 300 seated banquet layout, catering kitchen access…"
                    value={inquiryForm.notes}
                    onChange={e => setInquiryForm({ ...inquiryForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedVenueForInquiry(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Send Booking Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
