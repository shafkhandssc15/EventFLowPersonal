const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Reads the JWT persisted by AuthContext (see context/AuthContext.jsx) under
// the "ef_user" key, e.g. { token, id, name, email, role }.
function getToken() {
  try {
    const raw = localStorage.getItem("ef_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const bodyText = await res.text();
    let message = bodyText;
    try {
      const parsed = JSON.parse(bodyText);
      message = parsed?.message || parsed?.title || bodyText;
    } catch {
      // response wasn't JSON — use the raw text
    }
    if (!message) {
      if (res.status === 401) message = "Your session has expired or is invalid. Please log in again.";
      else if (res.status === 403) message = "You don't have permission to perform this action.";
      else message = `Request failed with status ${res.status}`;
    }
    const err = new Error(message);
    err.status = res.status;

    // 401 means "not logged in / bad or expired token" — the stored session is
    // no longer valid anywhere in the app, so clear it and send the user back
    // to the login page. 403 ("logged in but wrong role") is left for the
    // calling page to handle contextually (e.g. an inline permission message).
    if (res.status === 401) {
      try { localStorage.removeItem("ef_user"); } catch { /* ignore */ }
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // Auth
  login: (body) => request(`/auth/login`, { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request(`/auth/register`, { method: "POST", body: JSON.stringify(body) }),
  me: () => request(`/auth/me`),

  // Events (Student 1)
  listEvents: (params = {}) => request(`/events?${new URLSearchParams(params)}`),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (body) => request(`/events`, { method: "POST", body: JSON.stringify(body) }),
  updateEvent: (id, body) => request(`/events/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  publishEvent: (id) => request(`/events/${id}/publish`, { method: "POST" }),
  // Real soft-delete: organizer/admin only. Sets the event's status to PendingDeletion.
  cancelEvent: (id) => request(`/events/${id}`, { method: "DELETE" }),
  salesReport: (id) => request(`/events/${id}/sales-report`),

  // Venues & Vendors (Student 2)
  searchVenues: (params = {}) => request(`/venues?${new URLSearchParams(params)}`),
  updateVenue: (id, body) => request(`/venues/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  // Real soft-delete: owner/admin only. Sets the venue's IsPendingDeletion flag.
  deactivateVenue: (id) => request(`/venues/${id}`, { method: "DELETE" }),
  searchVendors: (params = {}) => request(`/vendors?${new URLSearchParams(params)}`),
  // Real soft-delete: owner/admin only. Sets the vendor's IsPendingDeletion flag.
  deactivateVendor: (id) => request(`/vendors/${id}`, { method: "DELETE" }),
  createBooking: (body) => request(`/vendor-bookings`, { method: "POST", body: JSON.stringify(body) }),
  confirmBooking: (id) => request(`/vendor-bookings/${id}/confirm`, { method: "POST" }),

  // Registrations & Check-in (Student 3)
  registerAttendee: (body) => request(`/registrations`, { method: "POST", body: JSON.stringify(body) }),
  attendeesForEvent: (eventId, params = {}) => request(`/registrations/event/${eventId}?${new URLSearchParams(params)}`),
  checkIn: (qrCode) => request(`/checkin`, { method: "POST", body: JSON.stringify({ qrCode }) }),

  // Budget & Payments (Student 4)
  budgetSummary: (id) => request(`/budgets/${id}/summary`),
  createExpense: (body) => request(`/expenses`, { method: "POST", body: JSON.stringify(body) }),
  approvalQueue: () => request(`/approvals/queue`),
  decideApproval: (id, approve) => request(`/approvals/${id}/decide?approve=${approve}`, { method: "POST" }),

  // Agentic AI workflow
  startWorkflow: (body) => request(`/agent-workflows`, { method: "POST", body: JSON.stringify(body) }),
  getWorkflow: (id) => request(`/agent-workflows/${id}`),
  approveWorkflow: (id, approve) => request(`/agent-workflows/${id}/approve?approve=${approve}`, { method: "POST" }),
};
