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

