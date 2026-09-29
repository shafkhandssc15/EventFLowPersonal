import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://fndjylgegtzjxdkkqjql.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_e1z-H7yT8G90cUwHcEKvWQ_t5-MpoPg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Reliable curated fallback image helper
export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80";

// Helper to format currency in Sri Lankan Rupees (LKR)
export function formatLKR(amount) {
  if (amount === 0) return "Free";
  return `Rs. ${Number(amount || 0).toLocaleString("en-LK")}`;
}

export async function saveSupabaseProfile(profile) {
  try {
    await supabase.from("profiles").upsert(profile);
  } catch (err) {
    console.warn("Profile save warning:", err);
  }
}
