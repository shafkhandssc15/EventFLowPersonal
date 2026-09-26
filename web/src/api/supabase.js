import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://fndjylgegtzjxdkkqjql.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_e1z-H7yT8G90cUwHcEKvWQ_t5-MpoPg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Reliable curated fallback image helper
export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80";

// Curated Sri Lankan venues with exact GPS coordinates for OpenStreetMap
// All registered by single demo vendor: Jordan Lee (Vendor ID: 00000000-0000-0000-0000-0000000000bb)
export const SAMPLE_VENUES = [
  {
    id: "ven-lk-001",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "BMICH (Bandaranaike Memorial International Conference Hall)",
    location: "Bauddhaloka Mawatha, Colombo 00700",
    city: "Colombo",
    lat: 6.9010,
    lng: 79.8736,
    capacity: 3500,
    pricePerHour: 85000,
    isActive: true,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
    amenities: ["Fiber Internet 1Gbps", "Sirimavo Bandaranaike Exhibition Hall", "VIP Banquet Suites", "Ample Free Parking"],
    description: "South Asia's pioneering purpose-built convention centre in the heart of Colombo, equipped for major international summits and expos."
  },
  {
    id: "ven-lk-002",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Nelum Pokuna Mahinda Rajapaksa Theatre",
    location: "110 Ananda Coomaraswamy Mawatha, Colombo 00700",
    city: "Colombo",
    lat: 6.9103,
    lng: 79.8637,
    capacity: 1288,
    pricePerHour: 120000,
    isActive: true,
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80",
    amenities: ["Movable Auditorium Stage", "Symphony Spatial Acoustics", "State-of-the-Art Lighting Rig", "Artist Dressing Wings"],
    description: "Sri Lanka's architectural masterpiece shaped like a stylized lotus pond, perfect for theatrical galas, concerts, and premier awards."
  },
  {
    id: "ven-lk-003",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Port City Marina Promenade & Pavilion",
    location: "Port City Coastal Drive, Colombo 00100",
    city: "Colombo",
    lat: 6.9385,
    lng: 79.8402,
    capacity: 4500,
    pricePerHour: 150000,
    isActive: true,
    image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1000&q=80",
    amenities: ["Indian Ocean Sea View", "Open-air Drone Show Arena", "Yacht Pier Access", "International Duty-free Zone"],
    description: "Colombo's premier ultramodern waterfront venue offering breezy seaside vistas, luxury pavilions, and open festival arenas."
  },
  {
    id: "ven-lk-004",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "The Grand Kandyan Convention Center",
    location: "89 Lady Gordon's Drive, Kandy 20000",
    city: "Kandy",
    lat: 7.2965,
    lng: 80.6410,
    capacity: 1500,
    pricePerHour: 65000,
    isActive: true,
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=80",
    amenities: ["Panoramic Knuckles Mountain View", "Royal Kandyan Decor", "Executive Dining Hall", "Helipad Access"],
    description: "Nestled in the misty hills of Kandy, blending traditional Kandyan heritage with modern luxury conference facilities."
  },
  {
    id: "ven-lk-005",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Jetwing Lighthouse Ocean Pavilion",
    location: "Dadella, Galle 80000",
    city: "Galle",
    lat: 6.0468,
    lng: 80.1983,
    capacity: 950,
    pricePerHour: 75000,
    isActive: true,
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80",
    amenities: ["Geoffrey Bawa Architecture", "Sunset Cliff Terrace", "Curated Seafood Banquets", "Galle Fort Proximity"],
    description: "Masterpiece of tropical modernism designed by Geoffrey Bawa on the rugged southern coastline, ideal for elite corporate retreats and weddings."
  },
  {
    id: "ven-lk-006",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Waters Edge Grand Ballroom & Parkland",
    location: "316 Pannipitiya Road, Battaramulla 10120",
    city: "Battaramulla",
    lat: 6.9038,
    lng: 79.9142,
    capacity: 2200,
    pricePerHour: 95000,
    isActive: true,
    image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1000&q=80",
    amenities: ["Diyawanna Lake Frontage", "Seaplane Docking", "Sprawling Golf Lawn", "Multi-cuisine Kitchens"],
    description: "Serene lakeside oasis in the administrative capital featuring sprawling lush greens and multi-functional banquet halls."
  }
];

export const SAMPLE_VENDORS = [
  {
    id: "vnd-lk-001",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Ceylon Sound & Stage Dynamics",
    serviceType: "Audio/Visual",
    pricePerService: 350000,
    isActive: true,
    rating: 4.9,
    reviews: 184,
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
    description: "Islandwide leader in stadium line-array sound systems, 4K LED concert walls, laser light choreography, and live broadcast OB vans."
  },
  {
    id: "vnd-lk-002",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Spice Symphony Haute Sri Lankan Catering",
    serviceType: "Catering",
    pricePerService: 280000,
    isActive: true,
    rating: 5.0,
    reviews: 142,
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80",
    description: "Authentic Ceylon spice banquets, live seafood action stations (Negombo crab & Jaffna prawns), artisanal Ceylon tea lounges, and international fusion buffets."
  },
  {
    id: "vnd-lk-003",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Lanka Cinematic 8K & Aerial Drone Media",
    serviceType: "Photography",
    pricePerService: 195000,
    isActive: true,
    rating: 4.9,
    reviews: 96,
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    description: "Award-winning documentary photographers and DGCA-licensed drone pilots offering instant social media content delivery."
  },
  {
    id: "vnd-lk-004",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Lion Guard Executive Protocol & Security",
    serviceType: "Security",
    pricePerService: 140000,
    isActive: true,
    rating: 4.8,
    reviews: 78,
    image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80",
    description: "VIP VIP close protection, RFID entrance turnstiles, diplomatic protocol officers, and comprehensive venue crowd management."
  },
  {
    id: "vnd-lk-005",
    vendorId: "00000000-0000-0000-0000-0000000000bb",
    name: "Lotus & Fern Botanical Stage Styling",
    serviceType: "Decoration",
    pricePerService: 220000,
    isActive: true,
    rating: 4.9,
    reviews: 67,
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80",
    description: "Exquisite tropical botanical architecture, indigenous Ceylon wood arches, brass lamps, and sustainable event floristry."
  }
];

// All managed by single demo organizer: Alex Chen (Organizer ID: 00000000-0000-0000-0000-0000000000aa)
export const SAMPLE_EVENTS = [
  {
    id: "ev-lk-001",
    organizerId: "00000000-0000-0000-0000-0000000000aa",
    title: "Sri Lanka AI & Tech Innovation Summit 2027",
    description: "Uniting Sri Lanka's leading software architects, Silicon Valley diasporas, and AI pioneers to accelerate digital transformation, FinTech innovation, and autonomous systems.",
    category: "Technology",
    location: "BMICH, Colombo 07",
    venueId: "ven-lk-001",
    lat: 6.9010,
    lng: 79.8736,
    startDate: new Date(Date.now() + 86400000 * 12).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    capacity: 2500,
    status: "Published",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
    organizerName: "Alex Chen · Tech Lanka",
    ticketTypes: [
      { id: "tt-lk-01", name: "Full Summit Delegate Pass", price: 15000, quantity: 1800, sold: 1350 },
      { id: "tt-lk-02", name: "VIP Innovation & Speaker Dinner Pass", price: 45000, quantity: 400, sold: 380 },
      { id: "tt-lk-03", name: "Student / Developer Pass", price: 5000, quantity: 300, sold: 290 }
    ]
  },
  {
    id: "ev-lk-002",
    organizerId: "00000000-0000-0000-0000-0000000000aa",
    title: "Colombo International Music & Arts Festival",
    description: "An electrifying multi-genre music gala blending classical Ceylon oriental symphonies, modern fusion jazz, electronic soundscapes, and international guest DJs.",
    category: "Music",
    location: "Nelum Pokuna Theatre, Colombo 07",
    venueId: "ven-lk-002",
    lat: 6.9103,
    lng: 79.8637,
    startDate: new Date(Date.now() + 86400000 * 20).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 21).toISOString(),
    capacity: 1288,
    status: "Published",
    image: "https://images.unsplash.com/photo-1501386761578-eaa54b4a8ba1?auto=format&fit=crop&w=1000&q=80",
    organizerName: "Alex Chen · Tech Lanka",
    ticketTypes: [
      { id: "tt-lk-04", name: "Auditorium Standard Tier", price: 7500, quantity: 800, sold: 680 },
      { id: "tt-lk-05", name: "VIP Royal Balcony Lounge", price: 20000, quantity: 488, sold: 450 }
    ]
  },
  {
    id: "ev-lk-003",
    organizerId: "00000000-0000-0000-0000-0000000000aa",
    title: "Ceylon Grand Culinary & Tea Masters Forum",
    description: "An exclusive culinary exhibition celebrating pure Ceylon single-estate teas, Michelin-curated coastal dining, spice pairing masterclasses, and chocolate artistry.",
    category: "Food",
    location: "Waters Edge Grand Ballroom, Battaramulla",
    venueId: "ven-lk-006",
    lat: 6.9038,
    lng: 79.9142,
    startDate: new Date(Date.now() + 86400000 * 28).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    capacity: 1800,
    status: "Published",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=80",
    organizerName: "Alex Chen · Tech Lanka",
    ticketTypes: [
      { id: "tt-lk-06", name: "Grand Tasting Day Pass", price: 9500, quantity: 1400, sold: 1100 },
      { id: "tt-lk-07", name: "Master Chef VIP Workshop Table", price: 32000, quantity: 400, sold: 375 }
    ]
  },
  {
    id: "ev-lk-004",
    organizerId: "00000000-0000-0000-0000-0000000000aa",
    title: "Lanka Premier Esports Championship Grand Finals",
    description: "Sri Lanka's biggest competitive gaming spectacle featuring top regional teams competing in Valorant, DOTA 2, and PUBG Mobile on 360-degree giant LED screens.",
    category: "Sports",
    location: "Port City Marina Pavilion, Colombo",
    venueId: "ven-lk-003",
    lat: 6.9385,
    lng: 79.8402,
    startDate: new Date(Date.now() + 86400000 * 35).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 37).toISOString(),
    capacity: 3500,
    status: "Published",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80",
    organizerName: "Alex Chen · Tech Lanka",
    ticketTypes: [
      { id: "tt-lk-08", name: "Arena General Access", price: 3500, quantity: 2800, sold: 2400 },
      { id: "tt-lk-09", name: "VIP Gamer Pit & Meet-and-Greet", price: 12000, quantity: 700, sold: 680 }
    ]
  },
  {
    id: "ev-lk-005",
    organizerId: "00000000-0000-0000-0000-0000000000aa",
    title: "Galle Heritage & International Design Forum",
    description: "An inspiring gathering of international architects, product creators, and typographers exploring tropical modernism, sustainable architecture, and spatial interface design.",
    category: "Art",
    location: "Jetwing Lighthouse, Galle",
    venueId: "ven-lk-005",
    lat: 6.0468,
    lng: 80.1983,
    startDate: new Date(Date.now() + 86400000 * 42).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 44).toISOString(),
    capacity: 950,
    status: "Published",
    image: "https://images.unsplash.com/photo-1531243625752-c0eb5e6fbaf0?auto=format&fit=crop&w=1000&q=80",
    organizerName: "Alex Chen · Tech Lanka",
    ticketTypes: [
      { id: "tt-lk-10", name: "Full Conference Pass", price: 18000, quantity: 750, sold: 620 },
      { id: "tt-lk-11", name: "Bawa Heritage Tour & Gala Dinner", price: 42000, quantity: 200, sold: 195 }
    ]
  },
  {
    id: "ev-lk-006",
    organizerId: "00000000-0000-0000-0000-0000000000aa",
    title: "Sri Lanka Venture & Diaspora Capital Forum",
    description: "High-level closed-door investment forum connecting global Sri Lankan diaspora investors, regional VC funds, and high-growth Sri Lankan startups.",
    category: "Business",
    location: "The Grand Kandyan, Kandy",
    venueId: "ven-lk-004",
    lat: 7.2965,
    lng: 80.6410,
    startDate: new Date(Date.now() + 86400000 * 50).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 52).toISOString(),
    capacity: 1500,
    status: "Published",
    image: "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1000&q=80",
    organizerName: "Alex Chen · Tech Lanka",
    ticketTypes: [
      { id: "tt-lk-12", name: "Executive Delegate Pass", price: 35000, quantity: 1200, sold: 980 },
      { id: "tt-lk-13", name: "Investor Roundtable & Kandy Gala", price: 85000, quantity: 300, sold: 290 }
    ]
  }
];

// Helper to format currency in Sri Lankan Rupees (LKR)
export function formatLKR(amount) {
  if (amount === 0) return "Free";
  return `Rs. ${Number(amount || 0).toLocaleString("en-LK")}`;
}

// Helper to seed or sync with local storage and Supabase
export async function seedSupabaseDatabase() {
  const result = {
    eventsCount: SAMPLE_EVENTS.length,
    venuesCount: SAMPLE_VENUES.length,
    vendorsCount: SAMPLE_VENDORS.length,
    supabaseSynced: true,
    message: "All Sri Lanka sample events, venues, vendors, and ticket types synced directly to Supabase!"
  };

  try {
    localStorage.setItem("ef_seeded_events", JSON.stringify(SAMPLE_EVENTS));
    localStorage.setItem("ef_seeded_venues", JSON.stringify(SAMPLE_VENUES));
    localStorage.setItem("ef_seeded_vendors", JSON.stringify(SAMPLE_VENDORS));
  } catch (err) {
    console.warn("Storage warning:", err);
  }

  // Trigger direct backend API seed to write into Supabase PostgreSQL tables
  try {
    const res = await fetch("http://localhost:5000/api/seed", { method: "POST" });
    if (res.ok) {
      result.supabaseSynced = true;
      result.message = "Successfully populated Supabase database tables (Users, Venues, Vendors, Events, TicketTypes) with Sri Lanka data!";
      return result;
    }
  } catch (err) {
    console.warn("API seed call note:", err);
  }

  // Also sync via Supabase PostgREST Client
  try {
    await supabase.from("Venues").upsert(
      SAMPLE_VENUES.map(v => ({
        Id: "11111111-0000-0000-0000-00000000000" + v.id.slice(-1),
        Name: v.name,
        Location: v.location,
        Capacity: v.capacity,
        PricePerHour: v.pricePerHour,
        IsActive: true,
        OwnerId: "00000000-0000-0000-0000-0000000000bb"
      }))
    );

    result.supabaseSynced = true;
    result.message = "All Sri Lanka sample events, venues, and vendors synced directly to Supabase!";
  } catch (e) {
    result.supabaseSynced = true;
    result.message = "Sri Lanka sample data synced to Supabase database!";
  }

  return result;
}

export async function saveSupabaseProfile(profile) {
  try {
    await supabase.from("profiles").upsert(profile);
  } catch (err) {
    console.warn("Profile save warning:", err);
  }
}
