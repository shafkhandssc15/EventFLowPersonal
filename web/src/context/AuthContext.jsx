import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "ef_user";
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Lightweight POST helper for the two public auth endpoints (register/login).
// Kept separate from api/client.js's `request()` so AuthContext has no
// dependency on a token that doesn't exist yet during login/register.
async function authPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }

  if (!res.ok) {
    const message =
      data?.message || data?.title || text || `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  });

  function persist(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
  }

  // Real login against the ASP.NET Core API. Returns { token, id, name, email, role }.
  // Throws an Error with `.status` set (401 = invalid credentials) on failure.
  async function login(email, password) {
    const session = await authPost("/auth/login", { email, password });
    persist(session);
    return session;
  }

  // Real registration against the ASP.NET Core API.
  // `role` must be one of "Organizer" | "VendorVenueManager" | "Attendee" | "Admin".
  // Throws an Error with `.status` set (409 = email already exists) on failure.
  async function register({ name, email, password, role }) {
    const session = await authPost("/auth/register", { name, email, password, role });
    persist(session);
    return session;
  }

  // Raw client-side session update (NOT a backend call). Used for things like
  // saving edited profile fields locally after the user is already authenticated.
  function updateUser(userData) {
    persist(userData);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token: user?.token || null, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
