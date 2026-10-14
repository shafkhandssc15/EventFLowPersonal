import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://fndjylgegtzjxdkkqjql.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_e1z-H7yT8G90cUwHcEKvWQ_t5-MpoPg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Reliable curated fallback image helper
export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80";

export const CATEGORY_COVERS = {
  Technology: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
  Music:      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
  Food:       "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
  Business:   "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
  Sports:     "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
  Art:        "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80",
  Health:     "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
  Education:  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
  Other:      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
};

export function getCategoryCover(category) {
  return CATEGORY_COVERS[category] || FALLBACK_IMAGE;
}

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

// Helper to accurately resolve GPS coordinates for Sri Lankan venues
export function getVenueCoordinates(name = "", location = "", city = "") {
  const text = `${name || ""} ${location || ""} ${city || ""}`.toLowerCase();

  if (text.includes("kandy") || text.includes("peradeniya") || text.includes("grand kandyan")) {
    return { lat: 7.2906, lng: 80.6337, city: "Kandy" };
  }
  if (text.includes("galle") || text.includes("lighthouse") || text.includes("dadella") || text.includes("unawatuna") || text.includes("hikkaduwa")) {
    return { lat: 6.0535, lng: 80.2210, city: "Galle" };
  }
  if (text.includes("waters edge") || text.includes("battaramulla") || text.includes("pannipitiya")) {
    return { lat: 6.9038, lng: 79.9142, city: "Battaramulla" };
  }
  if (text.includes("port city") || text.includes("marina promenade") || text.includes("coastal drive")) {
    return { lat: 6.9344, lng: 79.8428, city: "Colombo (Port City)" };
  }
  if (text.includes("nelum pokuna") || text.includes("ananda coomaraswamy") || text.includes("theatre")) {
    return { lat: 6.9110, lng: 79.8649, city: "Colombo 07" };
  }
  if (text.includes("bmich") || text.includes("bandaranaike") || text.includes("bauddhaloka")) {
    return { lat: 6.9010, lng: 79.8736, city: "Colombo 07" };
  }
  if (text.includes("jaffna")) {
    return { lat: 9.6615, lng: 80.0255, city: "Jaffna" };
  }
  if (text.includes("negombo")) {
    return { lat: 7.2008, lng: 79.8736, city: "Negombo" };
  }
  if (text.includes("nuwara eliya")) {
    return { lat: 6.9497, lng: 80.7891, city: "Nuwara Eliya" };
  }
  return { lat: 6.9271, lng: 79.8612, city: "Colombo" };
}

/**
 * Validates Sri Lankan and standard international contact/phone numbers.
 * Supports:
 * - Sri Lanka local mobile: 10 digits starting with 0 (e.g. 077 123 4567, 071-2345678)
 * - Sri Lanka local landline: 10 digits starting with 0 (e.g. 011 269 1111)
 * - Sri Lanka international: +94 followed by 9 digits (e.g. +94 77 123 4567, +94771234567)
 * - Standard international numbers: + followed by 9 to 15 digits (ITU-T E.164)
 */
export function isValidContactNumber(phone) {
  if (!phone || typeof phone !== "string") return false;
  const trimmed = phone.trim();

  // Basic structure check: only digits, spaces, hyphens, parentheses, optional leading +
  if (!/^\+?[0-9\s\-()]{9,20}$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");

  // Must have between 9 and 15 digits (ITU E.164 standard)
  if (digits.length < 9 || digits.length > 15) return false;

  // Reject all identical repeated digits (e.g. 0000000000, 1111111111)
  if (/^(\d)\1+$/.test(digits)) return false;

  // Sri Lanka international (+94 or 94...)
  if (trimmed.startsWith("+94") || digits.startsWith("94")) {
    const after94 = digits.startsWith("94") ? digits.slice(2) : digits;
    return after94.length === 9;
  }

  // Sri Lanka local (starts with 0)
  if (digits.startsWith("0")) {
    return digits.length === 10;
  }

  // Other valid international numbers
  return digits.length >= 9 && digits.length <= 15;
}


