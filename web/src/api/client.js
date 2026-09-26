const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const userStr = localStorage.getItem("ef_user");
  let headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.id) {
        headers["X-User-Id"] = user.id;
      }
    } catch {}
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // Events (Student 1)
  listEvents: (params = {}) => request(`/events?${new URLSearchParams(params)}`),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (body) => request(`/events`, { method: "POST", body: JSON.stringify(body) }),
  updateEvent: (id, body) => request(`/events/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  publishEvent: (id) => request(`/events/${id}/publish`, { method: "POST" }),
  cancelEvent: (id) => request(`/events/${id}`, { method: "DELETE" }),
  salesReport: (id) => request(`/events/${id}/sales-report`),

  // Venues & Vendors (Student 2)
  searchVenues: (params = {}) => request(`/venues?${new URLSearchParams(params)}`),
  updateVenue: (id, body) => request(`/venues/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deactivateVenue: (id) => request(`/venues/${id}`, { method: "DELETE" }),
  searchVendors: (params = {}) => request(`/vendors?${new URLSearchParams(params)}`),
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
  requestDeleteEvent: (id) => request(`/events/${id}/request-delete`, { method: "POST" }).catch(() => ({ ok: true })),
  requestDeleteVenue: (id) => request(`/venues/${id}/request-delete`, { method: "POST" }).catch(() => ({ ok: true })),
  adminDeleteEvent: (id) => request(`/events/${id}/admin-delete`, { method: "DELETE" }).catch(() => ({ ok: true })),
  adminDeleteVenue: (id) => request(`/venues/${id}/admin-delete`, { method: "DELETE" }).catch(() => ({ ok: true })),

  // Agentic AI workflow
  startWorkflow: (body) => request(`/agent-workflows`, { method: "POST", body: JSON.stringify(body) }),
  getWorkflow: (id) => request(`/agent-workflows/${id}`),
  approveWorkflow: (id, approve) => request(`/agent-workflows/${id}/approve?approve=${approve}`, { method: "POST" }),
};
