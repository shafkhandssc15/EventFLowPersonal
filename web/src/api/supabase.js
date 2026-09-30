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
