"""
Agent 1 - Planner/Coordinator Agent (owned by Student 1)

Upgraded for AI Lab Architecture:
- LLM Reasoning Engine: Generates dynamic event blueprints, phase milestones, and strategic execution steps.
- High-Availability: Powered by shared LLM Client (Gemini 3.8 Flash primary with Groq Failover).
- Output: Structured multi-step plan, draft event specifications, milestone timeline, and budget allocations.
"""

from typing import Any, Dict, List, Optional
import math
from agents.llm_client import call_llm, parse_json_from_llm


def detect_event_domain(objective: str) -> str:
    """Classifies event objective into specific domain."""
    obj = (objective or "").lower()
    if any(k in obj for k in ["hackathon", "code", "coding", "software", "tech", "developer", "ai", "robotics", "cyber"]):
        return "tech"
    if any(k in obj for k in ["concert", "music", "acoustic", "band", "festival", "dj", "edm", "live performance", "reggae", "rock"]):
        return "music"
    if any(k in obj for k in ["sports", "tournament", "championship", "cricket", "football", "badminton", "basketball", "marathon", "athletics"]):
        return "sports"
    if any(k in obj for k in ["wedding", "gala", "banquet", "dinner", "reception", "anniversary", "birthday", "party", "social"]):
        return "social"
    if any(k in obj for k in ["conference", "summit", "corporate", "agm", "expo", "exhibition", "product launch", "seminar"]):
        return "corporate"
    return "general"


def generate_domain_milestones(objective: str, capacity: int, budget: float, location: Optional[str]) -> List[Dict[str, Any]]:
    """Generates highly customized, domain-specific milestones with actionable task metadata and attendee-scaled counts."""
    cap = max(10, int(capacity or 200))
    bud = max(50000, float(budget or 1000000))
    loc = location or "Sri Lanka"
    domain = detect_event_domain(objective)

    if domain == "tech":
        team_count = max(4, round(cap / 4))
        wifi_devices = int(cap * 1.5)
        ap_count = max(2, math.ceil(cap / 80))
        turnstiles = max(1, math.ceil(cap / 150))
        stewards = max(3, math.ceil(cap / 40))
        meals = cap + max(5, round(cap * 0.08))
        finalists = min(10, max(3, round(cap / 50)))

        return [
            {
                "phase": "Phase 1: Pre-Event Infrastructure & Mentorship Matrix (T-60 Days)",
                "tasks": [
                    {
                        "task": f"Recruit {max(4, round(cap / 50))} industry mentors and establish {max(2, round(cap / 100))} domain tracks for {cap} registered participants",
                        "owner": "Community & Content Lead",
                        "priority": "High Priority",
                        "count": f"{cap} participants",
                        "deliverable": "Confirmed mentor roster & tracks"
                    },
                    {
                        "task": f"Architect high-density dual-band WiFi infrastructure supporting {wifi_devices} concurrent devices across {ap_count} access points",
                        "owner": "Network & Infrastructure Lead",
                        "priority": "Critical Path",
                        "count": f"{wifi_devices} devices ({ap_count} APs)",
                        "deliverable": "Bandwidth SLA & network topology map"
                    },
                    {
                        "task": f"Draft automated evaluation rubric and Git repository templates for {team_count} competing team pods",
                        "owner": "Academic & Tech Coordinator",
                        "priority": "Standard",
                        "count": f"{team_count} team pods",
                        "deliverable": "Repo scaffolds & judging rubric"
                    }
                ]
            },
            {
                "phase": "Phase 2: Cloud Sandbox, Power Grid & Swag Logistics (T-14 Days)",
                "tasks": [
                    {
                        "task": f"Provision {team_count} isolated cloud sandbox environments and pre-distribute API credential bundles",
                        "owner": "DevOps Systems Engineer",
                        "priority": "Critical Path",
                        "count": f"{team_count} cloud sandboxes",
                        "deliverable": "API credentials bundle"
                    },
                    {
                        "task": f"Deploy {team_count} high-output 220V power strips and projection displays across hacker pods in {loc}",
                        "owner": "AV & Electrical Supervisor",
                        "priority": "High Priority",
                        "count": f"{team_count} power distribution drops",
                        "deliverable": "Certified electrical load pass"
                    },
                    {
                        "task": f"Assemble {cap} personalized hacker swag backpacks containing badges, lanyards, and {meals} scheduled meal vouchers",
                        "owner": "Logistics Coordinator",
                        "priority": "Standard",
                        "count": f"{cap} delegate packs",
                        "deliverable": "Inventoried delegate backpacks"
                    }
                ]
            },
            {
                "phase": "Phase 3: Rapid Ingress, 24/7 Floor Support & Pitch Finale (Day 0)",
                "tasks": [
                    {
                        "task": f"Activate {turnstiles} high-throughput QR turnstile lanes onboarding {cap} participants with < 30s ingress speed",
                        "owner": "Access Control Lead",
                        "priority": "Critical Path",
                        "count": f"{turnstiles} QR turnstile lanes",
                        "deliverable": "Real-time biometric/QR ingress log"
                    },
                    {
                        "task": f"Station {stewards} technical facilitators and 1 certified first-aid medic for 24-hour continuous floor support",
                        "owner": "Security & Safety Lead",
                        "priority": "Standard",
                        "count": f"{stewards} floor staff & 1 medic",
                        "deliverable": "Active station duty roster"
                    },
                    {
                        "task": f"Conduct live 3-minute pitch showcase for top {finalists} finalist teams with synchronized judges leaderboard",
                        "owner": "Stage & Showrunner",
                        "priority": "High Priority",
                        "count": f"{finalists} finalist demos",
                        "deliverable": "Scored leaderboard & podium awards"
                    }
                ]
            }
        ]

    elif domain == "music":
        artists = min(8, max(2, round(cap / 200)))
        barrier_meters = max(20, round(cap * 0.15))
        sound_kw = max(5, round(cap * 0.05))
        turnstiles = max(2, math.ceil(cap / 200))
        security_guards = max(4, math.ceil(cap / 35))

        return [
            {
                "phase": "Phase 1: Artist Lineup, Decibel Licensing & Acoustic Survey (T-60 Days)",
                "tasks": [
                    {
                        "task": f"Negotiate artist rider agreements for {artists} headline & supporting acts with municipal sound permits",
                        "owner": "Artist Relations Manager",
                        "priority": "Critical Path",
                        "count": f"{artists} performing acts",
                        "deliverable": "Executed contracts & police permit"
                    },
                    {
                        "task": f"Conduct acoustic mapping & stage rigging engineering for {cap} concert attendees in {loc}",
                        "owner": "Chief Audio Engineer",
                        "priority": "High Priority",
                        "count": f"{cap} spectator zone",
                        "deliverable": "Line-array rigging approval"
                    },
                    {
                        "task": f"Finalize backstage hospitality riders and secure private green room trailers for {artists} artists",
                        "owner": "Hospitality Coordinator",
                        "priority": "Standard",
                        "count": f"{artists} VIP dressing suites",
                        "deliverable": "Catering & dressing room inventory"
                    }
                ]
            },
            {
                "phase": "Phase 2: Mojo Crowd Barriers, AV Line-Array & Security (T-14 Days)",
                "tasks": [
                    {
                        "task": f"Erect {barrier_meters} meters of heavy-duty Mojo crowd-surge barriers with dual-entry pit corridors",
                        "owner": "Site Operations Director",
                        "priority": "Critical Path",
                        "count": f"{barrier_meters}m safety barriers",
                        "deliverable": "Civil safety barrier sign-off"
                    },
                    {
                        "task": f"Calibrate {sound_kw}kW line-array PA system and multi-angle dynamic stage laser arrays",
                        "owner": "Production Director",
                        "priority": "High Priority",
                        "count": f"{sound_kw}kW audio production",
                        "deliverable": "Decibel & audio balance certification"
                    },
                    {
                        "task": f"Pre-program {cap} RFID wristbands partitioned by General Admission and VIP Golden Circle",
                        "owner": "Ticketing Lead",
                        "priority": "Standard",
                        "count": f"{cap} RFID wristbands",
                        "deliverable": "Synced access database"
                    }
                ]
            },
            {
                "phase": "Phase 3: Crowd Ingress, Pyrotechnics & Main Stage Live (Day 0)",
                "tasks": [
                    {
                        "task": f"Deploy {turnstiles} express RFID scanning gates processing {cap} fans with zero bottle-necking",
                        "owner": "Gate Operations Lead",
                        "priority": "Critical Path",
                        "count": f"{turnstiles} scanning lanes",
                        "deliverable": "Live gate check-in feed"
                    },
                    {
                        "task": f"Station {security_guards} licensed security guards, 2 paramedics, and 1 ambulance unit on standby",
                        "owner": "Emergency Response Head",
                        "priority": "Critical Path",
                        "count": f"{security_guards} security officers",
                        "deliverable": "Perimeter security command log"
                    },
                    {
                        "task": f"Execute live concert stage cues, timed sparkulars, and multi-track live master audio recording",
                        "owner": "Live Show Director",
                        "priority": "High Priority",
                        "count": f"{artists} live stage sets",
                        "deliverable": "Multi-track master recording"
                    }
                ]
            }
        ]

    elif domain == "sports":
        teams = max(4, round(cap / 20))
        athletes = teams * 10
        referees = max(2, math.ceil(teams / 2))
        courts = max(1, math.ceil(teams / 4))
        gates = max(1, math.ceil(cap / 200))

        return [
            {
                "phase": "Phase 1: Tournament Bracket, Sanctioning & Medical Safety (T-60 Days)",
                "tasks": [
                    {
                        "task": f"Seed {teams} competing teams ({athletes} athletes) and publish official tournament bracket",
                        "owner": "Tournament Director",
                        "priority": "Critical Path",
                        "count": f"{teams} teams ({athletes} athletes)",
                        "deliverable": "Published match schedule"
                    },
                    {
                        "task": f"Contract {referees} certified national referees and arrange ambulance medical standby for {loc}",
                        "owner": "Officiating Coordinator",
                        "priority": "High Priority",
                        "count": f"{referees} match officials",
                        "deliverable": "Signed referee contracts"
                    }
                ]
            },
            {
                "phase": "Phase 2: Playing Surfaces, Live Scoreboards & Athlete Kits (T-14 Days)",
                "tasks": [
                    {
                        "task": f"Commission {courts} regulated courts/pitches with synchronized electronic digital scoreboards",
                        "owner": "Facilities Director",
                        "priority": "High Priority",
                        "count": f"{courts} competition zones",
                        "deliverable": "Surface safety certification"
                    },
                    {
                        "task": f"Distribute {athletes} personalized athlete kits, jerseys, numbers, and hydration packs",
                        "owner": "Athlete Logistics Manager",
                        "priority": "Standard",
                        "count": f"{athletes} athlete kits",
                        "deliverable": "Weigh-in & gear check verification"
                    }
                ]
            },
            {
                "phase": "Phase 3: Fixture Execution, Spectator Flow & Awards Podium (Day 0)",
                "tasks": [
                    {
                        "task": f"Direct spectator seating flow for {cap} ticket holders across {gates} grandstand turnstiles",
                        "owner": "Spectator Operations",
                        "priority": "Critical Path",
                        "count": f"{cap} spectator capacity",
                        "deliverable": "Grandstand crowd distribution"
                    },
                    {
                        "task": "Host championship finals and gold/silver/bronze trophy presentation ceremony",
                        "owner": "Ceremonies Lead",
                        "priority": "High Priority",
                        "count": "3 podium medal sets",
                        "deliverable": "Official tournament rankings"
                    }
                ]
            }
        ]

    elif domain == "social":
        tables = max(2, math.ceil(cap / 10))
        welcome_servings = int(cap * 1.1)

        return [
            {
                "phase": "Phase 1: Menu Tasting, Seating Architecture & Vendor Holds (T-60 Days)",
                "tasks": [
                    {
                        "task": f"Finalize 5-course gourmet banquet menu tasting and design {tables} 10-seater round table layouts in {loc}",
                        "owner": "Banquet & Hospitality Lead",
                        "priority": "Critical Path",
                        "count": f"{tables} banquet tables",
                        "deliverable": "Approved banquet menu & seating chart"
                    },
                    {
                        "task": "Contract principal photographer, 2 4K videographers, and bilingual Master of Ceremonies (MC)",
                        "owner": "Creative Producer",
                        "priority": "High Priority",
                        "count": "4 media & entertainment crew",
                        "deliverable": "Executed media contracts & shot-list"
                    }
                ]
            },
            {
                "phase": "Phase 2: Floral Staging, Seating Escort Cards & Soundcheck (T-14 Days)",
                "tasks": [
                    {
                        "task": f"Fabricate {tables} bespoke floral centerpieces and assemble {cap} personalized guest favor gift boxes",
                        "owner": "Floral & Decor Designer",
                        "priority": "Standard",
                        "count": f"{cap} customized favor boxes",
                        "deliverable": "Table decor presentation sign-off"
                    },
                    {
                        "task": "Execute full timeline run-through with bridal/host party and MC covering speech audio cues and entrance music",
                        "owner": "Lead Event Coordinator",
                        "priority": "High Priority",
                        "count": "1 complete dress rehearsal",
                        "deliverable": "Master run-of-show schedule"
                    }
                ]
            },
            {
                "phase": "Phase 3: Guest Ingress, Banquet Service & Evening Celebration (Day 0)",
                "tasks": [
                    {
                        "task": f"Welcome {cap} guests with {welcome_servings} signature mocktails/cocktails and oversee guestbook registration",
                        "owner": "Guest Relations Lead",
                        "priority": "Standard",
                        "count": f"{welcome_servings} welcome drinks",
                        "deliverable": "Digital guest signature roster"
                    },
                    {
                        "task": f"Orchestrate synchronized {cap}-guest dinner service, ceremonial toasts, and celebratory dance floor lighting",
                        "owner": "Head of Floor Operations",
                        "priority": "Critical Path",
                        "count": f"{cap} served guests",
                        "deliverable": "Seamless banquet timetable"
                    }
                ]
            }
        ]

    else:  # corporate / conference / general
        speakers = max(3, round(cap / 80))
        booths = max(4, round(cap / 50))
        turnstiles = max(1, math.ceil(cap / 150))
        vip_passes = max(10, round(cap * 0.15))

        return [
            {
                "phase": "Phase 1: Executive Agenda, Speaker Onboarding & Exhibition Blueprint (T-60 Days)",
                "tasks": [
                    {
                        "task": f"Curate executive summit agenda securing {speakers} keynote speakers and {booths} enterprise sponsor booths",
                        "owner": "Program Director",
                        "priority": "Critical Path",
                        "count": f"{speakers} keynote speakers",
                        "deliverable": "Published summit program"
                    },
                    {
                        "task": f"Design high-flow exhibition floor plan and VIP executive lounge for {cap} delegates in {loc}",
                        "owner": "Exhibition Manager",
                        "priority": "High Priority",
                        "count": f"{booths} sponsor exhibition spaces",
                        "deliverable": "Approved trade exhibition layout"
                    }
                ]
            },
            {
                "phase": "Phase 2: NFC Badges, Teleprompter Rehearsals & Livestream Pipeline (T-14 Days)",
                "tasks": [
                    {
                        "task": f"Pre-encode {cap} NFC delegate credentials and {vip_passes} VIP Executive Lounge access passes",
                        "owner": "Registration Lead",
                        "priority": "Standard",
                        "count": f"{cap} NFC badges",
                        "deliverable": "Inventoried delegate badges"
                    },
                    {
                        "task": "Execute comprehensive AV dry-run testing teleprompters, presentation switchers, and 4K livestream uplink",
                        "owner": "Technical Production Director",
                        "priority": "High Priority",
                        "count": "2 multi-screen stage test runs",
                        "deliverable": "Broadcast uplink certification"
                    }
                ]
            },
            {
                "phase": "Phase 3: Seamless Check-In, Main Stage Keynotes & Executive Mixer (Day 0)",
                "tasks": [
                    {
                        "task": f"Process {cap} delegates through {turnstiles} contactless NFC check-in lanes with average queue time < 20s",
                        "owner": "Ingress Supervisor",
                        "priority": "Critical Path",
                        "count": f"{turnstiles} NFC check-in stations",
                        "deliverable": "Real-time delegate attendance feed"
                    },
                    {
                        "task": "Manage plenary sessions, roving Q&A audience microphones, and transition to evening executive networking reception",
                        "owner": "Floor Operations Chief",
                        "priority": "High Priority",
                        "count": f"{speakers} hosted plenary sessions",
                        "deliverable": "Recorded proceedings archive"
                    }
                ]
            }
        ]


def create_event_draft(objective: str, capacity: int, budget: float, event_date: str, location: Optional[str]) -> Dict[str, Any]:
    """Tool: creates an event draft record with standardized metadata."""
    return {
        "title": objective[:80],
        "capacity": capacity,
        "budget": budget,
        "event_date": event_date,
        "location": location or "Sri Lanka",
        "status": "Draft",
    }


def create_plan_record(steps: List[str]) -> Dict[str, Any]:
    """Tool: persists the plan record."""
    return {"steps": steps, "step_count": len(steps)}


def run(objective: str, capacity: int, budget: float, event_date: str, location: Optional[str]) -> Dict[str, Any]:
    draft = create_event_draft(objective, capacity, budget, event_date, location)
    required_data = ["objective", "capacity", "budget", "event_date", "location"]
    risk_flags: List[str] = []

    if not objective or not str(objective).strip():
        risk_flags.append("missing_objective")
    if not isinstance(capacity, int) or capacity <= 0:
        risk_flags.append("invalid_capacity")
    if not isinstance(budget, (int, float)) or budget <= 0:
        risk_flags.append("invalid_budget")
    if not event_date:
        risk_flags.append("missing_event_date")
    if not location or not str(location).strip():
        risk_flags.append("location_not_specified")

    domain = detect_event_domain(objective)

    prompt = f"""You are the Planner / Coordinator Agent in an autonomous Event Management platform.
Create a structured event execution plan tailored specifically to the '{domain.upper()}' domain with actionable task metadata and exact counts.

Event Objective: "{objective}"
Target Capacity: {capacity} attendees
Total Budget: Rs. {budget:,.0f} LKR
Event Date: {event_date}
Target Location: {location or 'Flexible / Sri Lanka'}

CRITICAL REQUIREMENT FOR MILESTONES:
- Each milestone phase MUST contain structured tasks with actionable metadata.
- Each task MUST be an object with:
  "task": Actionable task description featuring exact scaled count metrics (e.g. WiFi devices, staff stewards, meal packs, tables)
  "owner": Responsible operational lead (e.g. 'Network & Infrastructure Lead', 'Artist Relations Manager', 'Banquet Lead')
  "priority": 'Critical Path' | 'High Priority' | 'Standard'
  "count": Exact metric or quantity scaled with attendee count
  "deliverable": Tangible verified output (e.g. 'Signed decibel permit', 'Bandwidth SLA & topology')

Generate JSON with:
1. "title": professional event title matching objective
2. "summary": 1-2 sentence executive overview
3. "domain": "{domain}"
4. "steps": array of 5 operational action step codes
5. "milestones": array of 3 domain-tailored phases (T-60 Days, T-14 Days, Day 0) with actionable task objects containing counts and owners
6. "budget_breakdown": array of 4 categories with allocated values and percentages
7. "required_data": list of required inputs for execution
8. "risk_flags": list of risk flags relevant to this request

Return STRICT JSON ONLY:"""

    import hashlib
    obj_hash = hashlib.md5(str(objective).strip().lower().encode()).hexdigest()[:8]

    raw_response, engine_name = call_llm(
        prompt,
        system_prompt="You are an expert AI event coordinator. Provide structured JSON only; do not make approval decisions.",
        cache_key=f"planner_{obj_hash}_{capacity}_{int(budget)}_{location}"
    )

    parsed = parse_json_from_llm(raw_response) if raw_response else None

    if parsed and isinstance(parsed, dict) and "steps" in parsed:
        steps = parsed.get("steps", [
            "find_venue_and_vendor", "book_vendor", "create_ticket_types", "allocate_budget", "schedule_notifications"
        ])
        milestones = parsed.get("milestones", [])
        if not milestones or not isinstance(milestones, list) or len(milestones) == 0:
            milestones = generate_domain_milestones(objective, capacity, budget, location)
        budget_breakdown = parsed.get("budget_breakdown", [])
        required_data = parsed.get("required_data", required_data)
        risk_flags = parsed.get("risk_flags", risk_flags)
        if "title" in parsed:
            draft["title"] = parsed["title"]
        summary = parsed.get("summary", f"Autonomous event blueprint for {objective}")
    else:
        steps = [
            "find_venue_and_vendor",
            "book_vendor",
            "create_ticket_types",
            "allocate_budget",
            "schedule_notifications",
        ]
        milestones = generate_domain_milestones(objective, capacity, budget, location)
        budget_breakdown = [
            {"category": "Venue & Stage Logistics", "allocated": budget * 0.45, "pct": "45%"},
            {"category": "Catering & Hospitality", "allocated": budget * 0.30, "pct": "30%"},
            {"category": "AV & Production", "allocated": budget * 0.15, "pct": "15%"},
            {"category": "Contingency Reserve", "allocated": budget * 0.10, "pct": "10%"}
        ]
        summary = f"Event planning blueprint for {objective} ({capacity} attendees, Rs. {budget:,.0f} LKR)"

    plan_record = create_plan_record(steps)

    return {
        "agent": "PlannerCoordinatorAgent",
        "input": {"objective": objective, "capacity": capacity, "budget": budget, "event_date": event_date, "location": location},
        "output": {
            "draft_event": draft,
            "plan": {
                "steps": steps,
                "required_data": required_data,
                "risk_flags": risk_flags,
                "step_count": len(steps),
            },
            "steps": steps,
            "required_data": required_data,
            "risk_flags": risk_flags,
            "summary": summary,
            "milestones": milestones,
            "budget_breakdown": budget_breakdown,
            "llm_engine": engine_name,
        },
        "tool_calls": ["create_event_draft", "create_plan_record", f"llm_plan_decomposition({engine_name})"],
    }
