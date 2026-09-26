import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { IcSearch, IcCalendar, IcMapPin, IcUsers, IcCompass, IcGrid } from "../components/Icons.jsx";
import { FALLBACK_IMAGE } from "../api/supabase.js";
import VenueMap from "../components/VenueMap.jsx";

const CATS = ["All", "Technology", "Music", "Sports", "Art", "Food", "Business"];

const STATUS_MAP = {
  Draft:     { cls: "badge-gray",   dot: "#555" },
  Published: { cls: "badge-green",  dot: "#16a34a" },
  Ongoing:   { cls: "badge-blue",   dot: "#2563eb" },
  Completed: { cls: "badge-purple", dot: "#7c3aed" },
  Cancelled: { cls: "badge-red",    dot: "#dc2626" },
};

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [cat, setCat] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    api.listEvents(cat ? { category: cat } : {})
      .then(res => {
        const items = res.items || res || [];
        setEvents(items);
      })
      .catch((err) => {
        setEvents([]);
        setLoadError(err.message || "Could not reach the EventFlow API.");
      })
      .finally(() => setLoading(false));
  }, [cat]);

  useEffect(() => {
    // Real registered venues for the map view. An empty/down backend now
    // shows an honest empty map instead of hardcoded fixture venues.
    api.searchVenues()
      .then(res => setVenues(res.items || res || []))
      .catch(() => setVenues([]));
  }, []);

  const filtered = events.filter(ev =>
    !search ||
    ev.title?.toLowerCase().includes(search.toLowerCase()) ||
    ev.location?.toLowerCase().includes(search.toLowerCase()) ||
    ev.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Events in Sri Lanka</span>
        <div className="topbar-actions">
          <div className="input-wrap" style={{ width: 260 }}>
            <IcSearch className="input-icon" />
            <input
              className="form-input"
              placeholder="Search Colombo, Kandy, Galle…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, height: 34, fontSize: 13 }}
            />
          </div>
          <div className="tabs" style={{ background: "var(--c-bg-1)", padding: 2 }}>
            <button
              className={`tab ${viewMode === "grid" ? "on" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <IcGrid style={{ width: 13, height: 13 }} />
            </button>
            <button
              className={`tab ${viewMode === "map" ? "on" : ""}`}
              onClick={() => setViewMode("map")}
              title="OpenStreetMap Sri Lanka"
            >
              <IcCompass style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ paddingTop: 24 }}>
        {/* Hero */}
        <div className="hero">
          <div className="hero-eyebrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Sri Lanka's Premier Event Network
          </div>
          <h1 className="hero-title">
            <span className="hero-title-grad">Discover Extraordinary<br />Events Across Sri Lanka</span>
          </h1>
          <p className="hero-desc">
            Explore world-class summits in Colombo, cultural galas in Kandy, and heritage festivals in Galle with OpenStreetMap precision.
          </p>
        </div>

        {/* Category filter */}
        <div className="filter-bar">
          {CATS.map(c => (
            <button
              key={c}
              className={`filter-chip ${cat === (c === "All" ? "" : c) ? "on" : ""}`}
              onClick={() => setCat(c === "All" ? "" : c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* View mode toggle: Grid vs Map */}
        {viewMode === "map" ? (
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <IcCompass style={{ width: 16, height: 16, color: "var(--c-blue)" }} />
              Interactive OpenStreetMap Sri Lanka
            </div>
            <VenueMap
              venues={venues}
              height="500px"
            />
          </div>
        ) : null}

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/>
            </svg>
            <div className="empty-title">{loadError ? "Couldn't load events" : "No events found"}</div>
            <div className="empty-desc">
              {loadError
                ? `${loadError} — the EventFlow API may be unreachable. Try refreshing shortly.`
                : cat ? `No ${cat} events found in Sri Lanka right now.` : "Try another search keyword."}
            </div>
          </div>
        ) : (
          <div className="events-grid">
            {filtered.map(ev => {
              const st = STATUS_MAP[ev.status] || STATUS_MAP.Published;
              const img = ev.image || ev.imageUrl || FALLBACK_IMAGE;
              return (
                <Link to={`/events/${ev.id}`} className="event-card" key={ev.id}>
                  <div className="event-card-cover">
                    <img
                      src={img}
                      alt={ev.title}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                    <div className="event-card-cover-gradient" />
                    <div className="event-card-cover-tag">
                      <span className={`badge ${st.cls}`}>
                        <span className="badge-dot" style={{ background: st.dot }} />
                        {ev.status || "Published"}
                      </span>
                    </div>
                  </div>
                  <div className="event-card-body">
                    <div className="event-card-cat">{ev.category || "Technology"}</div>
                    <div className="event-card-title">{ev.title}</div>
                    <div className="event-card-meta">
                      <IcCalendar className="event-card-meta-icon" />
                      {new Date(ev.startDate || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {ev.location && (
                      <div className="event-card-meta">
                        <IcMapPin className="event-card-meta-icon" />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.location}</span>
                      </div>
                    )}
                    <div className="event-card-footer">
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--c-text-2)" }}>
                        <IcUsers style={{ width: 12, height: 12, color: "var(--c-text-3)" }} />
                        {Number(ev.capacity || 1000).toLocaleString()} capacity
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-blue)" }}>
                        Passes &amp; Map →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
