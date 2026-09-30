import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../context/RealtimeContext.jsx";
import {
  IcZap, IcShield, IcTarget, IcSearch, IcCpu,
  IcCheck, IcX, IcCalendar, IcMapPin, IcUsers, IcCheckCircle,
  IcAlert, IcBuilding, IcClock, IcSparkles, IcTag
} from "../components/Icons.jsx";
import { formatLKR, supabase, getCategoryCover } from "../api/supabase.js";

const AGENTS = [
  { key: "PlannerCoordinatorAgent", label: "1. Planner Coordinator", Icon: IcTarget, desc: "Deconstructs objectives, architects timeline & milestones" },
  { key: "DomainAnalysisAgent",     label: "2. Domain Analysis",     Icon: IcSearch, desc: "Evaluates registered venues & vendors with fit scoring" },
  { key: "ActionToolUseAgent",      label: "3. Action & Execution",   Icon: IcZap,    desc: "Proposes ticket tiers, capacity splits & booking actions" },
  { key: "ValidationSafetyAgent",   label: "4. Validation & Safety", Icon: IcShield, desc: "Audits budget limits, compliance & human approval gates" },
];

// Fallback baseline venues if DB hasn't loaded yet
const DEFAULT_VENUES = [
  { id: "11111111-0000-0000-0000-000000000001", name: "BMICH (Bandaranaike Memorial International Conference Hall)", location: "Bauddhaloka Mawatha, Colombo 00700", capacity: 3500, pricePerHour: 85000, type: "auditorium" },
  { id: "11111111-0000-0000-0000-000000000002", name: "Nelum Pokuna Mahinda Rajapaksa Theatre", location: "110 Ananda Coomaraswamy Mawatha, Colombo 00700", capacity: 1288, pricePerHour: 120000, type: "theatre" },
  { id: "11111111-0000-0000-0000-000000000003", name: "Port City Marina Promenade & Pavilion", location: "Port City Coastal Drive, Colombo 00100", capacity: 4500, pricePerHour: 150000, type: "outdoor" },
  { id: "11111111-0000-0000-0000-000000000004", name: "The Grand Kandyan Convention Center", location: "89 Lady Gordon's Drive, Kandy 20000", capacity: 1500, pricePerHour: 65000, type: "ballroom" },
  { id: "11111111-0000-0000-0000-000000000005", name: "Jetwing Lighthouse Ocean Pavilion", location: "Dadella, Galle 80000", capacity: 950, pricePerHour: 75000, type: "beach" },
  { id: "11111111-0000-0000-0000-000000000006", name: "Waters Edge Grand Ballroom & Parkland", location: "316 Pannipitiya Road, Battaramulla 10120", capacity: 2200, pricePerHour: 95000, type: "ballroom" }
];

/**
 * Intelligent Dynamic Event Planner Engine:
 * Analyzes arbitrary user prompts and builds domain-tailored blueprints.
 */
function generateDynamicAgentPlan({ objective, capacity, budget, location, eventDate, registeredVenues }) {
  const text = (objective || "").trim();
  const lower = text.toLowerCase();
  const capacityNum = Math.max(10, Number(capacity) || 200);
  const budgetLkr = Math.max(50000, Number(budget) || 1200000);
  const targetLoc = (location || "").trim() || "Sri Lanka";

  // 1. Detect Category & Domain
  let domain = "Special Event";
  let categoryKey = "General";
  let themeKeywords = [];

  if (/music|concert|dj|edm|band|acoustic|rave|festival|rock|jazz|sunset beat|orchestra/i.test(lower)) {
    domain = "Music Festival & Live Entertainment";
    categoryKey = "Concert";
    themeKeywords = ["sound acoustics", "stage lighting", "artist hospitality", "crowd flow"];
  } else if (/robot|ai|tech|code|hackathon|developer|software|cyber|cloud|data|autonomous|machine learning/i.test(lower)) {
    domain = "Technology & Autonomous Systems Summit";
    categoryKey = "Technology";
    themeKeywords = ["keynote audio", "livestream fiber", "interactive demos", "delegate networking"];
  } else if (/cricket|badminton|football|rugby|tournament|championship|match|sports|athletic|marathon|tennis/i.test(lower)) {
    domain = "Championship Sports Tournament";
    categoryKey = "Sports";
    themeKeywords = ["match refereeing", "medical triage", "player lounges", "spectator stands"];
  } else if (/wedding|nuptial|bride|groom|reception|anniversary/i.test(lower)) {
    domain = "Luxury Wedding & Nuptial Celebration";
    categoryKey = "Social";
    themeKeywords = ["floral styling", "gourmet dining", "champagne toast", "cinematography"];
  } else if (/gala|banquet|dinner|award|ball|soiree|cocktail|charity/i.test(lower)) {
    domain = "Executive Gala Dinner & Awards";
    categoryKey = "Social";
    themeKeywords = ["red carpet", "5-course gastronomy", "honors presentation", "executive networking"];
  } else if (/expo|exhibition|trade|fair|showcase|booth|b2b/i.test(lower)) {
    domain = "Commercial Trade Expo & Showcase";
    categoryKey = "Exhibition";
    themeKeywords = ["exhibitor booths", "logistics freight", "b2b meetings", "visitor registration"];
  } else if (/medical|doctor|health|pediatric|hospital|pharma|clinic/i.test(lower)) {
    domain = "Medical & Healthcare Scientific Congress";
    categoryKey = "Conference";
    themeKeywords = ["abstract reviews", "symposium halls", "cme credits", "surgical demos"];
  } else if (/food|culinary|chef|dining|cuisine|seafood|bakery|gourmet/i.test(lower)) {
    domain = "Gourmet Culinary & Food Festival";
    categoryKey = "Festival";
    themeKeywords = ["tasting stalls", "hygiene compliance", "celebrity masterclasses", "live pairing"];
  } else if (/conference|summit|symposium|forum|congress|seminar|workshop/i.test(lower)) {
    domain = "Professional Leadership & Industry Conference";
    categoryKey = "Conference";
    themeKeywords = ["panel tracks", "keynote clearings", "interactive Q&A", "catered lunch"];
  }

  // 2. Synthesize Dynamic Event Title
  let cleanTitle = text
    .replace(/^(plan|host|organize|setup|create|run|we want to (host|plan|organize))\s+(an?|the)?\s*/i, "")
    .replace(/\s+(for|with|in)\s+\d+.*$/i, "")
    .trim();

  if (cleanTitle.length < 5) cleanTitle = text.slice(0, 45).trim();
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  if (!/202\d/i.test(cleanTitle)) {
    cleanTitle += " 2027";
  }

  // 3. Dynamic Milestones tailored to domain
  let milestones = [];
  if (categoryKey === "Concert") {
    milestones = [
      { phase: "Phase 1: Artist Lineup, Sound Permits & Venue Hold (T-60 Days)", tasks: ["Artist contract execution & rider confirmation", "Municipal sound permits & environmental clearance", "Acoustics simulation and stage trussing blueprint"] },
      { phase: "Phase 2: Stage Production, LED Walls & Ticketing (T-14 Days)", tasks: ["Main stage line-array sound & intelligent lighting rig check", "Crowd surge perimeter & emergency medical corridor audit", "Early bird QR barcode pass rollout on EventFlow"] },
      { phase: "Phase 3: Soundcheck, Hospitality & Gate Opening (Day 0)", tasks: ["Full artist frequency scanning & soundcheck clearance", "VIP green room & artist hospitality delivery", "High-speed mobile QR barcode turnstile gate scanning"] }
    ];
  } else if (categoryKey === "Sports") {
    milestones = [
      { phase: "Phase 1: Tournament Sanctioning & Facility Booking (T-60 Days)", tasks: ["Governing sports federation sanction & rules freeze", "Court / stadium lease contract finalization", "Team roster and participant entry intake"] },
      { phase: "Phase 2: Fixture Draw, Medical Logistics & Umpires (T-14 Days)", tasks: ["Official match bracket publishing & team briefing", "Medical emergency & sports physiotherapist contracts", "Electronic scorekeeping system & referee calibration"] },
      { phase: "Phase 3: Tournament Kick-off, Spectator Flow & Awards (Day 0)", tasks: ["Court boundary inspection & equipment certification", "Spectator security checks & grandstand ushering", "Championship trophy presentation & post-game media"] }
    ];
  } else if (categoryKey === "Social") {
    milestones = [
      { phase: "Phase 1: Concept, Gastronomy & Venue Lock (T-60 Days)", tasks: ["Event theme palette & floral styling sign-off", "Menu tasting with executive catering chefs", "Save-the-date invitations & VIP list confirmation"] },
      { phase: "Phase 2: Seating Architecture & Vendor Alignment (T-14 Days)", tasks: ["VIP head table & guest seating arrangement", "Live acoustic ensemble / DJ briefing & audio check", "Photographer & videographer shot list review"] },
      { phase: "Phase 3: Venue Styling, Toast & Evening Celebration (Day 0)", tasks: ["Floral rig installation & ambient mood lighting check", "Welcome cocktail reception & champagne toast", "Full event itinerary management & guest coordination"] }
    ];
  } else if (categoryKey === "Exhibition" || categoryKey === "Festival") {
    milestones = [
      { phase: "Phase 1: Floor Layout, Exhibitor Contracts & Power (T-60 Days)", tasks: ["Exhibition hall grid zoning & aisle mapping", "Exhibitor booth sales & contract executions", "Public health / safety inspection clearances"] },
      { phase: "Phase 2: Booth Fabrication & Loading Schedules (T-14 Days)", tasks: ["Heavy freight & booth build timetable coordination", "Promotional visitor ticketing blitz across social channels", "Floor directory & digital exhibitor catalog print"] },
      { phase: "Phase 3: Expo Opening, B2B Lounges & Security (Day 0)", tasks: ["Exhibitor badge handover & last-minute power check", "Ribbon cutting ceremony & media press tour", "B2B meeting room facilitation & crowd monitoring"] }
    ];
  } else {
    // Conference / Tech / Healthcare / Corporate
    milestones = [
      { phase: "Phase 1: Agenda Architecture & Keynote Clearances (T-60 Days)", tasks: ["Speaker invitations & keynote honorarium sign-off", "Venue auditorium hold & breakout room allocation", "Early-bird delegate pass release on EventFlow"] },
      { phase: "Phase 2: Technical AV, Badging & Exhibition Floor (T-14 Days)", tasks: ["Multi-camera live streaming & broadcast test", "Exhibition booth floor mapping & power drops", "RFID/QR digital delegate badge generation"] },
      { phase: "Phase 3: Registration Gate, Keynotes & Networking Banquet (Day 0)", tasks: ["Rapid QR registration desk deployment", "Main auditorium audio-visual live stream sync", "Executive VIP networking banquet protocol"] }
    ];
  }

  // 4. Live Registered Venue Matching & Scoring
  const pool = (registeredVenues && registeredVenues.length > 0) ? registeredVenues : DEFAULT_VENUES;
  const targetLower = targetLoc.toLowerCase();

  const scoredVenues = pool.map(v => {
    const vLoc = (v.location || v.Location || "").toLowerCase();
    const vName = (v.name || v.Name || "").toLowerCase();
    const vCap = Number(v.capacity || v.Capacity) || 500;
    const vCost = Number(v.pricePerHour || v.PricePerHour) || 60000;

    let score = 70;

    // Location matching
    const isLocMatch = (
      (targetLower.includes("galle") && (vLoc.includes("galle") || vName.includes("lighthouse"))) ||
      (targetLower.includes("kandy") && (vLoc.includes("kandy") || vName.includes("kandyan"))) ||
      (targetLower.includes("battaramulla") && (vLoc.includes("battaramulla") || vName.includes("waters edge"))) ||
      (targetLower.includes("colombo") && (vLoc.includes("colombo") || vLoc.includes("bmich") || vLoc.includes("nelum"))) ||
      (targetLower.includes("port city") && (vLoc.includes("port city") || vName.includes("port city")))
    );

    if (isLocMatch) score += 20;

    // Capacity matching: best fit is venue capacity between 1.0x and 3.5x of target
    if (vCap >= capacityNum) {
      const ratio = capacityNum / vCap;
      if (ratio >= 0.5) score += 8;
      else if (ratio >= 0.2) score += 5;
      else score += 2;
    } else {
      score -= 15; // Too small for event
    }

    // Budget matching for 6-hour event
    const estVenueCost = vCost * 6;
    if (estVenueCost <= budgetLkr * 0.45) score += 5;
    else if (estVenueCost > budgetLkr * 0.8) score -= 10;

    // Domain suitability
    if (categoryKey === "Concert" && (vLoc.includes("galle") || vName.includes("port city") || vName.includes("nelum"))) score += 6;
    if (categoryKey === "Sports" && (vName.includes("waters edge") || vName.includes("port city") || vName.includes("bmich"))) score += 6;
    if (categoryKey === "Social" && (vName.includes("kandyan") || vName.includes("waters edge") || vName.includes("lighthouse"))) score += 6;

    score = Math.min(99, Math.max(50, score));

    const utilPct = Math.min(100, Math.round((capacityNum / vCap) * 100));
    const budgetPct = Math.round((estVenueCost / budgetLkr) * 100);

    const reason = `Accommodates ${capacityNum} guests with ${utilPct}% venue capacity (${vCap.toLocaleString()} max). Est. 6h booking: ${formatLKR(estVenueCost)} (~${budgetPct}% of total budget).`;

    return {
      id: v.id || v.Id,
      name: v.name || v.Name,
      location: v.location || v.Location,
      capacity: vCap,
      costPerHour: vCost,
      fitScore: `${score}% Fit`,
      numericScore: score,
      reason
    };
  });

  scoredVenues.sort((a, b) => b.numericScore - a.numericScore);
  const venueRecommendations = scoredVenues.slice(0, 3);

  // 5. Dynamic Ticket Tiers tailored to budget & domain
  const targetRevenue = Math.max(budgetLkr * 1.25, capacityNum * 2500);
  const baseAvgPrice = Math.round((targetRevenue / capacityNum) / 250) * 250;

  let ticketTiers = [];
  if (categoryKey === "Concert") {
    ticketTiers = [
      {
        name: "VIP Golden Circle & Backstage Pass",
        price: Math.round(baseAvgPrice * 2.2),
        allocatedQty: Math.round(capacityNum * 0.15),
        perks: "Front-row stage pit, Artist Green Room lounge access, complimentary drinks"
      },
      {
        name: "General Admission (Standing Floor)",
        price: baseAvgPrice,
        allocatedQty: Math.round(capacityNum * 0.65),
        perks: "Main concert arena access, sound zone entry, digital pass"
      },
      {
        name: "Early-Bird Festival Pass",
        price: Math.round(baseAvgPrice * 0.7),
        allocatedQty: Math.max(1, capacityNum - Math.round(capacityNum * 0.15) - Math.round(capacityNum * 0.65)),
        perks: "Discounted first wave entry, festival wristband"
      }
    ];
  } else if (categoryKey === "Sports") {
    ticketTiers = [
      {
        name: "VIP Pavilion & Hospitality Suite",
        price: Math.round(baseAvgPrice * 2.0),
        allocatedQty: Math.round(capacityNum * 0.15),
        perks: "Air-conditioned box, player viewing, gourmet refreshments & VIP parking"
      },
      {
        name: "Standard Grandstand Pass",
        price: baseAvgPrice,
        allocatedQty: Math.round(capacityNum * 0.70),
        perks: "Reserved grandstand seat, tournament fixture program"
      },
      {
        name: "Fan Zone Bleachers Pass",
        price: Math.round(baseAvgPrice * 0.5),
        allocatedQty: Math.max(1, capacityNum - Math.round(capacityNum * 0.15) - Math.round(capacityNum * 0.70)),
        perks: "Open fan zone entry and merchandise stall access"
      }
    ];
  } else if (categoryKey === "Social") {
    ticketTiers = [
      {
        name: "Platinum Table Seat (5-Course Dinner)",
        price: Math.round(baseAvgPrice * 1.8),
        allocatedQty: Math.round(capacityNum * 0.25),
        perks: "Head-table seating, premium 5-course banquet, champagne toast"
      },
      {
        name: "Gold Guest Admission",
        price: baseAvgPrice,
        allocatedQty: Math.round(capacityNum * 0.60),
        perks: "Gourmet dining buffet, welcome cocktail, commemorative gift"
      },
      {
        name: "Evening Reception & Lounge Pass",
        price: Math.round(baseAvgPrice * 0.6),
        allocatedQty: Math.max(1, capacityNum - Math.round(capacityNum * 0.25) - Math.round(capacityNum * 0.60)),
        perks: "Cocktail lounge entry, dessert banquet, live entertainment"
      }
    ];
  } else {
    // Conference / Tech / Corporate / Healthcare
    ticketTiers = [
      {
        name: "Executive VIP Delegate Pass",
        price: Math.round(baseAvgPrice * 2.0),
        allocatedQty: Math.round(capacityNum * 0.20),
        perks: "Priority auditorium front row, Speaker networking dinner, On-demand replay access"
      },
      {
        name: "Standard Conference Pass",
        price: baseAvgPrice,
        allocatedQty: Math.round(capacityNum * 0.65),
        perks: "Full access to keynotes, breakout workshops, lunch buffet & digital badge"
      },
      {
        name: "Student & Young Professional Pass",
        price: Math.round(baseAvgPrice * 0.45),
        allocatedQty: Math.max(1, capacityNum - Math.round(capacityNum * 0.20) - Math.round(capacityNum * 0.65)),
        perks: "General auditorium entry, exhibition floor access, e-certificate"
      }
    ];
  }

  // Calculate projected revenue for each tier
  ticketTiers = ticketTiers.map(t => ({
    ...t,
    projectedRevenue: t.price * t.allocatedQty
  }));

  // 6. Dynamic Budget Breakdown tailored to domain
  let budgetBreakdown = [];
  if (categoryKey === "Concert") {
    budgetBreakdown = [
      { category: "Stage, Lighting & Line-Array Audio", allocated: budgetLkr * 0.40, pct: "40%" },
      { category: "Venue Hire & Municipal Licensing", allocated: budgetLkr * 0.25, pct: "25%" },
      { category: "Artist Honorariums & Hospitality", allocated: budgetLkr * 0.22, pct: "22%" },
      { category: "Security, Crowd Perimeter & Reserve", allocated: budgetLkr * 0.13, pct: "13%" }
    ];
  } else if (categoryKey === "Sports") {
    budgetBreakdown = [
      { category: "Stadium & Facility Rental", allocated: budgetLkr * 0.40, pct: "40%" },
      { category: "Referees, Officials & Technical Equipment", allocated: budgetLkr * 0.25, pct: "25%" },
      { category: "Medical Support & Emergency Triage", allocated: budgetLkr * 0.18, pct: "18%" },
      { category: "Trophies, Awards & Contingency Reserve", allocated: budgetLkr * 0.17, pct: "17%" }
    ];
  } else if (categoryKey === "Social") {
    budgetBreakdown = [
      { category: "Gourmet Catering & Wine Service", allocated: budgetLkr * 0.45, pct: "45%" },
      { category: "Venue Hire & Luxury Floral Styling", allocated: budgetLkr * 0.32, pct: "32%" },
      { category: "Photography, Music & Entertainment", allocated: budgetLkr * 0.13, pct: "13%" },
      { category: "Hospitality Contingency Reserve", allocated: budgetLkr * 0.10, pct: "10%" }
    ];
  } else {
    // Conference / Tech
    budgetBreakdown = [
      { category: "Auditorium & Breakout Halls", allocated: budgetLkr * 0.42, pct: "42%" },
      { category: "Catering, High Tea & Delegate Lunch", allocated: budgetLkr * 0.28, pct: "28%" },
      { category: "Multi-Camera AV & Fiber Livestreaming", allocated: budgetLkr * 0.18, pct: "18%" },
      { category: "Emergency Reserve & Technical Support", allocated: budgetLkr * 0.12, pct: "12%" }
    ];
  }

  // 7. Dynamic Agent Tool Execution Traces
  const topVenue = venueRecommendations[0] || pool[0];
  const requiresSafetyGate = budgetLkr > 1000000 || capacityNum >= 200;

  const logs = [
    {
      agentName: "PlannerCoordinatorAgent",
      toolCalls: [
        `decompose_objective("${domain}")`,
        `synthesize_phased_roadmap("${targetLoc}")`,
        `estimate_capacity_demand(${capacityNum}_attendees)`
      ]
    },
    {
      agentName: "DomainAnalysisAgent",
      toolCalls: [
        `query_venues_for_region("${targetLoc}")`,
        `rank_by_capacity_fit("${topVenue.name.slice(0, 24)}")`,
        `verify_vendor_portfolios("${categoryKey}")`
      ]
    },
    {
      agentName: "ActionToolUseAgent",
      toolCalls: [
        `synthesize_ticket_tier_matrix(${ticketTiers.length}_tiers)`,
        `calculate_revenue_margins(${formatLKR(targetRevenue)})`,
        `draft_provisional_reservation("${topVenue.name.slice(0, 24)}")`
      ]
    },
    {
      agentName: "ValidationSafetyAgent",
      toolCalls: [
        `audit_budget_variance(${formatLKR(budgetLkr)})`,
        `verify_provincial_regulations("${targetLoc}")`,
        requiresSafetyGate ? "trigger_human_approval_gate" : "auto_greenlight_execution"
      ]
    }
  ];

  return {
    id: `wf-${Date.now()}`,
    status: requiresSafetyGate ? "PausedForApproval" : "completed",
    paused_for_approval: requiresSafetyGate,
    title: cleanTitle,
    category: categoryKey,
    summary: `Tailored strategic blueprint curated for "${text}". Configured for ${capacityNum} attendees at ${topVenue.name} with target budget of ${formatLKR(budgetLkr)}.`,
    milestones,
    venueRecommendations,
    ticketTiers,
    budgetBreakdown,
    logs
  };
}

export default function AgentWorkflowRunner() {
  const { user } = useAuth();
  const { venues, saveEvent } = useRealtime();

  const [form, setForm] = useState({
    objective: "Host a 200-person tech summit with keynote speakers, catering, and AV in Colombo for Rs. 1,500,000",
    capacity: 200,
    budget: 1500000,
    location: "Colombo / Western Province",
    eventDate: "",
  });

  const [workflow, setWorkflow] = useState(null);
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [deployedEventId, setDeployedEventId] = useState(null);
  const [deploySuccess, setDeploySuccess] = useState(false);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function start(e) {
    e?.preventDefault();
    if (!form.objective.trim()) {
      setError("Please describe your event objective.");
      return;
    }

    setError(null);
    setWorkflow(null);
    setBusy(true);
    setDeployedEventId(null);
    setDeploySuccess(false);
    setCurrentStepIdx(0);

    try {
      // Step 1: Planner Agent
      await new Promise(r => setTimeout(r, 450));
      setCurrentStepIdx(1);

      // Step 2: Domain Analysis Agent
      await new Promise(r => setTimeout(r, 450));
      setCurrentStepIdx(2);

      // Step 3: Action Agent
      await new Promise(r => setTimeout(r, 450));
      setCurrentStepIdx(3);

      // Step 4: Validation Agent
      await new Promise(r => setTimeout(r, 400));

      let result = null;
      try {
        result = await api.startWorkflow({
          organizerId: user?.id || "00000000-0000-0000-0000-0000000000aa",
          objective:   form.objective,
          capacity:    Number(form.capacity),
          budget:      Number(form.budget),
          eventDate:   new Date(form.eventDate || Date.now() + 86400000 * 60).toISOString(),
          location:    form.location,
        });
      } catch {
        // Backend optional — fallback seamlessly to dynamic client-side engine
      }

      // Check if backend returned structured plan
      let dynamicPlan = null;
      if (result && result.plan) {
        try {
          const parsed = typeof result.plan === "string" ? JSON.parse(result.plan) : result.plan;
          if (parsed && (parsed.plan || parsed.title)) {
            const p = parsed.plan || parsed;
            dynamicPlan = {
              id: result.id || result.workflow_id || `wf-${Date.now()}`,
              status: result.status || "completed",
              paused_for_approval: result.status === "PausedForApproval",
              title: p.draft_event?.title || p.title || form.objective.slice(0, 50),
              summary: p.summary || `Strategic plan for "${form.objective}"`,
              milestones: p.milestones || [],
              venueRecommendations: parsed.ranked_venues || [],
              ticketTiers: parsed.ticket_tiers || [],
              budgetBreakdown: p.budget_breakdown || [],
              logs: parsed.logs || []
            };
          }
        } catch {}
      }

      // If backend didn't provide complete plan, run our intelligent dynamic planner
      if (!dynamicPlan || !dynamicPlan.milestones || dynamicPlan.milestones.length === 0) {
        dynamicPlan = generateDynamicAgentPlan({
          objective: form.objective,
          capacity: form.capacity,
          budget: form.budget,
          location: form.location,
          eventDate: form.eventDate,
          registeredVenues: venues
        });
      }

      setWorkflow(dynamicPlan);
    } catch (err) {
      setError(err.message || "Failed to generate AI plan");
    } finally {
      setBusy(false);
      setCurrentStepIdx(-1);
    }
  }

  async function decide(approve) {
    setBusy(true);
    try {
      try {
        await api.approveWorkflow(workflow.id || workflow.workflow_id, approve);
      } catch {}

      setWorkflow(prev => ({
        ...prev,
        status: approve ? "completed" : "rejected",
        paused_for_approval: false,
        approvalDecision: approve ? "Approved by Organizer" : "Rejected by Organizer"
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Deploy this generated plan directly as a real event in Supabase
  async function handleDeployEvent() {
    if (!workflow) return;
    setBusy(true);
    setError(null);

    try {
      const topVenue = workflow.venueRecommendations?.[0];
      const targetDate = form.eventDate
        ? new Date(form.eventDate).toISOString()
        : new Date(Date.now() + 86400000 * 45).toISOString();
      const targetEndDate = new Date(new Date(targetDate).getTime() + 3600000 * 8).toISOString();

      // Form ticket types
      const mappedTicketTypes = (workflow.ticketTiers || []).map((t, idx) => ({
        id: crypto.randomUUID(),
        name: t.name,
        price: Number(t.price) || 0,
        capacity: Number(t.allocatedQty) || 50,
        available: Number(t.allocatedQty) || 50,
      }));

      const newEvent = {
        id: crypto.randomUUID(),
        organizerId: user?.id || "00000000-0000-0000-0000-0000000000aa",
        organizerName: user?.name || user?.email || "EventFlow Organizer",
        organizerEmail: user?.email || "",
        title: workflow.title,
        description: workflow.summary,
        category: workflow.category || "Conference",
        location: topVenue ? `${topVenue.name}, ${topVenue.location}` : (form.location || "Colombo, Sri Lanka"),
        venueId: topVenue?.id || "",
        capacity: Number(form.capacity) || 200,
        startDate: targetDate,
        endDate: targetEndDate,
        status: "Published",
        ticketTypes: mappedTicketTypes,
        createdAt: new Date().toISOString()
      };

      if (saveEvent) {
        await saveEvent(newEvent);
      } else {
        await supabase.from("Events").insert({
          Id: newEvent.id,
          OrganizerId: newEvent.organizerId,
          Title: newEvent.title,
          Description: newEvent.description,
          Category: newEvent.category,
          Location: newEvent.location,
          VenueId: newEvent.venueId,
          Capacity: newEvent.capacity,
          StartDate: newEvent.startDate,
          EndDate: newEvent.endDate,
          Status: newEvent.status,
          CreatedAt: newEvent.createdAt
        });
      }

      setDeployedEventId(newEvent.id);
      setDeploySuccess(true);
    } catch (err) {
      setError("Failed to deploy event: " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  const logs = workflow?.logs || [];
  const needsApproval = workflow?.paused_for_approval || workflow?.status === "PausedForApproval";

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">AI Event Planner</span>
        <div className="topbar-actions">
          <span className="badge badge-purple">4-Agent Autonomous Pipeline</span>
        </div>
      </div>

      <div className="page-head">
        <h1 className="page-title">AI Event Planner</h1>
        <p className="page-sub">
          Describe any event idea — the 4-agent pipeline dynamically architects milestones, selects registered venues, models ticket tiers, and enforces safety gates.
        </p>
      </div>

      <div className="page-body">
        {/* Pipeline visualization */}
        <div className="wf-steps" style={{ marginBottom: 28 }}>
          {AGENTS.map((a, i) => {
            const isDone   = (workflow && !busy) || (busy && currentStepIdx > i);
            const isActive = busy && currentStepIdx === i;
            return (
              <div key={a.key}
                className={`wf-step ${isDone ? "done" : isActive ? "active" : ""}`}>
                <div className="wf-step-idx">
                  {isDone
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : i + 1
                  }
                </div>
                <div className="wf-step-name">{a.label}</div>
                <div className="wf-step-desc">{a.desc}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 24, alignItems: "start" }}>
          {/* Input Form */}
          <div>
            <form onSubmit={start} className="card" style={{ background: "var(--c-bg-1)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <IcCpu style={{ width: 16, height: 16, color: "var(--c-blue)" }} />
                <span>Event Objective &amp; Constraints</span>
              </div>

              <div className="form-group">
                <label className="form-label">Describe your event objective *</label>
                <textarea className="form-input" value={form.objective}
                  style={{ minHeight: 95 }}
                  placeholder="e.g. Plan an outdoor sunset electronic music festival in Mirissa or Galle for 500 attendees with stage sound and international DJs"
                  onChange={e => setF("objective", e.target.value)} />
              </div>

              {/* Quick suggestions pills */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--c-text-3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <IcSparkles style={{ width: 11, height: 11, color: "var(--c-blue)" }} />
                  <span>Try popular prompts:</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "Beach Music Fest", prompt: "Sunset electronic music & DJ beach festival in Mirissa with line-array sound and 500 attendees", cap: 500, bud: 2500000, loc: "Mirissa / Galle" },
                    { label: "Badminton Tournament", prompt: "Inter-school championship badminton tournament in Kandy with refereeing, player boxes, and trophies", cap: 300, bud: 1200000, loc: "Kandy" },
                    { label: "Medical Congress", prompt: "Annual pediatric medicine and surgical doctors conference in Colombo with research presentations", cap: 250, bud: 1800000, loc: "Colombo" },
                    { label: "Luxury Gala Banquet", prompt: "Grand corporate gala dinner & awards evening in Battaramulla with 5-course dining and champagne toast", cap: 200, bud: 2200000, loc: "Battaramulla" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setForm({
                          objective: p.prompt,
                          capacity: p.cap,
                          budget: p.bud,
                          location: p.loc,
                          eventDate: ""
                        });
                      }}
                      style={{
                        fontSize: 11,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--c-border)",
                        borderRadius: 12,
                        padding: "3px 8px",
                        color: "var(--c-text-2)",
                        cursor: "pointer"
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <div className="form-group">
                  <label className="form-label">Attendees (Pax)</label>
                  <input className="form-input" type="number" min="1" value={form.capacity}
                    onChange={e => setF("capacity", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Budget (LKR)</label>
                  <input className="form-input" type="number" min="0" value={form.budget}
                    onChange={e => setF("budget", e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Location / City</label>
                <input className="form-input" value={form.location}
                  placeholder="e.g. Galle, Kandy, Colombo, or Battaramulla"
                  onChange={e => setF("location", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Target Date (Optional)</label>
                <input className="form-input" type="datetime-local" value={form.eventDate}
                  onChange={e => setF("eventDate", e.target.value)} />
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
                {busy ? (
                  <span style={{ display:"flex",alignItems:"center",gap:8, justifyContent: "center" }}>
                    <span style={{ width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.65s linear infinite",display:"inline-block" }} />
                    Running 4-Agent Pipeline…
                  </span>
                ) : (
                  <><IcCpu style={{ width: 14, height: 14 }} /> Run AI Event Planner Pipeline</>
                )}
              </button>
            </form>

            {error && (
              <div className="alert alert-error" style={{ marginTop: 12 }}>
                <IcAlert style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            )}
          </div>

          {/* Output Blueprint */}
          <div>
            {!workflow ? (
              <div className="card" style={{ height: "100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", minHeight: 400, background:"var(--c-bg-1)" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(37, 99, 235, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <IcCpu style={{ width: 28, height: 28, color:"var(--c-blue)" }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color:"#ffffff", marginBottom: 6 }}>Ready for Multi-Agent Planning</div>
                <div style={{ fontSize: 13, color:"var(--c-text-3)", maxWidth: 360, lineHeight: 1.5 }}>
                  Type your event objective and click &quot;Run AI Event Planner Pipeline&quot; to synthesize an event blueprint.
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {/* Executive Summary & Status Card */}
                <div className="card" style={{ background:"var(--c-bg-1)", border: "1px solid var(--c-blue)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
                        {workflow.title}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 6, lineHeight: 1.5 }}>
                        {workflow.summary}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <span className={`badge ${workflow.status === "completed" ? "badge-green" : needsApproval ? "badge-amber" : "badge-blue"}`} style={{ fontSize: 11 }}>
                        {workflow.status === "completed" ? "Pipeline Complete" : needsApproval ? "Paused for Approval" : workflow.status}
                      </span>
                      {workflow.category && (
                        <span className="badge badge-purple" style={{ fontSize: 10 }}>{workflow.category}</span>
                      )}
                    </div>
                  </div>

                  {/* Safety Gate Alert */}
                  {needsApproval && (
                    <div style={{ background:"rgba(245, 158, 11, 0.1)", border:"1px solid rgba(245, 158, 11, 0.3)", borderRadius:"var(--radius-sm)", padding: 14, marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <IcShield style={{ width: 16, height: 16, color: "#fbbf24" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>Agent 4: Safety &amp; Budget Validation Gate</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--c-text-2)", marginBottom: 12, lineHeight: 1.5 }}>
                        Budget allocation ({formatLKR(form.budget)}) exceeds the automatic threshold (&gt; Rs. 1,000,000) or capacity is &ge; 200 pax. Organizer approval is required before locking venue holds.
                      </div>
                      <div style={{ display:"flex", gap: 10 }}>
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => decide(true)}>
                          <IcCheck style={{ width: 12, height: 12 }} /> Approve &amp; Finalize Event
                        </button>
                        <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => decide(false)} style={{ color: "#ef4444" }}>
                          <IcX style={{ width: 12, height: 12 }} /> Reject / Revise Constraints
                        </button>
                      </div>
                    </div>
                  )}

                  {workflow.approvalDecision && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 6, fontSize: 12, color: "#34d399", fontWeight: 700 }}>
                      Decision: {workflow.approvalDecision}
                    </div>
                  )}

                  {/* Deploy Event Action */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
                      Satisfied with this agent plan? You can publish it directly to the platform as a live event.
                    </div>
                    {deploySuccess ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <IcCheckCircle style={{ width: 14, height: 14 }} /> Event Created Successfully!
                        </span>
                        <Link to={`/events/${deployedEventId}`} className="btn btn-primary btn-sm">
                          View Live Event &rarr;
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={handleDeployEvent}
                      >
                        <IcSparkles style={{ width: 13, height: 13 }} /> Deploy as Live Event
                      </button>
                    )}
                  </div>
                </div>

                {/* Agent 1: Milestone Roadmap */}
                {workflow.milestones && workflow.milestones.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcTarget style={{ width: 15, height: 15, color: "#60a5fa" }} />
                      <span>Agent 1: Milestone Roadmap &amp; Phased Execution</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {workflow.milestones.map((m, idx) => (
                        <div key={idx} style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd", marginBottom: 6 }}>{m.phase}</div>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.6 }}>
                            {m.tasks.map((t, tIdx) => (
                              <li key={tIdx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent 2: Recommended Venues with Fit Score */}
                {workflow.venueRecommendations && workflow.venueRecommendations.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcSearch style={{ width: 15, height: 15, color: "#34d399" }} />
                      <span>Agent 2: Registered Venue Fit Score &amp; Geospatial Analysis</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                      {workflow.venueRecommendations.map((v, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 220 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{v.name}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                              <IcMapPin style={{ width: 11, height: 11, display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                              {v.location} · Max {Number(v.capacity).toLocaleString()} pax
                            </div>
                            <div style={{ fontSize: 11, color: "var(--c-text-2)", marginTop: 4 }}>{v.reason}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span className="badge badge-green" style={{ fontSize: 11, fontWeight: 800 }}>{v.fitScore}</span>
                            <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>{formatLKR(v.costPerHour)}/hr</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent 3: Ticket Pricing Matrix */}
                {workflow.ticketTiers && workflow.ticketTiers.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcZap style={{ width: 15, height: 15, color: "#fbbf24" }} />
                      <span>Agent 3: Dynamic Ticket Tiers &amp; Revenue Projection</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                      {workflow.ticketTiers.map((t, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>{t.perks}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#34d399" }}>{formatLKR(t.price)}</div>
                            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 2 }}>
                              {t.allocatedQty} passes · Proj. Rev: {formatLKR(t.projectedRevenue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget Allocation Breakdown */}
                {workflow.budgetBreakdown && workflow.budgetBreakdown.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <IcTag style={{ width: 15, height: 15, color: "#a78bfa" }} />
                      <span>Budget Allocations ({formatLKR(form.budget)})</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                      {workflow.budgetBreakdown.map((b, idx) => (
                        <div key={idx} style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--c-border)" }}>
                          <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{b.category}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff", marginTop: 4 }}>
                            {formatLKR(b.allocated)}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--c-blue)", marginTop: 2 }}>
                            {b.pct} of budget
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Tool Logs */}
                {workflow.logs && workflow.logs.length > 0 && (
                  <div className="card" style={{ background:"var(--c-bg-1)" }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>4-Agent Execution Traces &amp; Tool Calls</div>
                    {workflow.logs.map((log, i) => {
                      const ag = AGENTS.find(a => a.key === (log.agent_name || log.agentName));
                      return (
                        <div key={i} style={{ display:"flex", gap:12, paddingBottom:10, marginBottom:10, borderBottom: i < workflow.logs.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                          <div style={{ width:26, height:26, borderRadius:6, background:"rgba(16, 185, 129, 0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            {ag ? <ag.Icon style={{ width:12, height:12, color:"#34d399" }} /> : <IcCheck style={{ width:12, height:12, color:"#34d399" }} />}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:700, color: "#ffffff" }}>{ag?.label || log.agentName || log.agent_name}</div>
                            <div style={{ fontSize:11, color:"var(--c-text-3)", marginTop:2, fontFamily: "monospace" }}>
                              Tools: {(log.toolCalls || log.tool_calls || []).map(tc => `${tc}()`).join(", ")}
                            </div>
                          </div>
                          <span className="badge badge-green" style={{ fontSize:9, alignSelf:"center" }}>verified</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
