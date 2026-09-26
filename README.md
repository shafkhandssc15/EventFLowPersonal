# 🎟️ Event Management Platform

> A production-ready, full-stack event management system powered by **ASP.NET Core**, **PostgreSQL**, **React**, **Flutter**, and a **4-agent Agentic AI subsystem**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Backend API](#backend-api)
- [Agentic AI Subsystem](#agentic-ai-subsystem)
- [Web Application](#web-application)
- [Mobile Application](#mobile-application)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Component Ownership](#component-ownership)
- [Whats Implemented vs Stubbed](#whats-implemented-vs-stubbed)
- [Roadmap and Next Steps](#roadmap-and-next-steps)
- [Contributing](#contributing)

---

## Overview

The **Event Management Platform** is a comprehensive, multi-client application that handles the full lifecycle of an event — from creation and ticketing, through venue/vendor booking, attendee registration with QR check-in, to budget tracking and payment approval.

A core differentiator is the **4-agent AI subsystem**: when an organizer submits an event objective, a chain of autonomous agents (Planner → Domain Analysis → Action → Validation) generates a complete event plan, selects and tentatively reserves the best venue/vendor, and automatically pauses for human approval when the estimated cost exceeds the budget threshold.

```
Organizer submits objective
         │
         ▼
  [1] Planner Agent        → Generates structured event plan
         │
         ▼
  [2] Domain Analysis Agent → Ranks venues & vendors by fit/score
         │
         ▼
  [3] Action Agent          → Tentatively reserves top venue, drafts tickets
         │
         ▼
  [4] Validation Agent      → Checks cost vs. budget threshold
         │
    ┌────┴────┐
    │ over    │ under
    ▼         ▼
  Paused   Confirmed
  (human   (auto-approved)
  approval)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│                                                             │
│   React Web App (Vite)         Flutter Mobile App           │
│   localhost:5173               Android/iOS device           │
│   - Organizer Dashboard        - Event browsing             │
│   - AI Planner UI              - Registration               │
│   - Approval Queue             - QR Check-in                │
│   - Vendor/Venue Mgmt                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │  HTTP/REST
                   ▼
┌─────────────────────────────────────────────────────────────┐
│            ASP.NET Core Web API  (port 5000)                │
│                                                             │
│  EventsController      BudgetsController                    │
│  RegistrationsController  VenuesVendorsController           │
│  AgentWorkflowController  (single entry-point for AI)       │
└──────────────────┬─────────────────────┬────────────────────┘
                   │ EF Core / Npgsql    │ HttpClient
                   ▼                     ▼
┌──────────────────────┐  ┌──────────────────────────────────┐
│  PostgreSQL 16       │  │  Python / FastAPI Agent Service  │
│  (Docker, port 5432) │  │  (port 8000)                     │
│                      │  │                                  │
│  16 tables           │  │  planner_agent.py                │
│  6 custom ENUMs      │  │  domain_analysis_agent.py        │
│  13 indexes          │  │  action_agent.py                 │
└──────────────────────┘  │  validation_agent.py             │
                          │  orchestrator.py                 │
                          └──────────────────────────────────┘
```

> **Key design constraint**: React and Flutter **never** call the agent service directly. Only the ASP.NET Core API communicates with it via `AgentWorkflowController`.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Backend API** | ASP.NET Core Web API | .NET 8 |
| **ORM** | Entity Framework Core + Npgsql | 8.0.x |
| **Database** | PostgreSQL | 16 |
| **Agent Service** | Python + FastAPI | 3.11+ / 0.114 |
| **Web App** | React + Vite | 18 / 5 |
| **Mobile App** | Flutter + Dart | SDK ≥3.3 |
| **QR Scanning** | `mobile_scanner` | 5.x |
| **QR Generation** | `qr_flutter` | 4.x |
| **State (mobile)** | `provider` | 6.x |
| **Auth (planned)** | JWT Bearer | — |
| **Payments (planned)** | Stripe Test Mode | — |
| **Notifications (planned)** | SendGrid / Twilio | — |
| **Container** | Docker Compose | — |

---

## Project Structure

```
event-management-platform/
├── database/
│   └── schema.sql                  # PostgreSQL schema (all tables, enums, indexes)
│
├── backend/
│   └── EventManagement.Api/
│       ├── Controllers/
│       │   ├── AgentWorkflowController.cs   # Single AI entry-point
│       │   ├── BudgetsController.cs         # Budget & expense management
│       │   ├── EventsController.cs          # Event CRUD + ticketing
│       │   ├── RegistrationsController.cs   # Attendee registration & check-in
│       │   └── VenuesVendorsController.cs   # Venue/vendor booking
│       ├── Data/
│       │   └── AppDbContext.cs              # EF Core context
│       ├── DTOs/                            # Request/Response DTOs
│       ├── Models/
│       │   ├── Entities.cs                  # All domain entities
│       │   └── Enums.cs                     # Status enums
│       ├── Program.cs                       # Service registration, middleware
│       ├── appsettings.json                 # Config (DB conn string, JWT, agent URL)
│       └── EventManagement.Api.csproj
│
├── agents/
│   ├── agents/
│   │   ├── planner_agent.py         # Agent 1: event plan generation
│   │   ├── domain_analysis_agent.py # Agent 2: venue/vendor ranking
│   │   ├── action_agent.py          # Agent 3: reservation + QR + notification
│   │   └── validation_agent.py      # Agent 4: budget safety gate
│   ├── orchestrator.py              # Wires the 4-agent chain + in-memory state
│   ├── main.py                      # FastAPI app: /workflow/run, /workflow/resume
│   └── requirements.txt
│
├── web/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js            # Typed API client (all fetch calls)
│   │   ├── pages/
│   │   │   ├── EventsList.jsx
│   │   │   ├── EventDetail.jsx
│   │   │   ├── OrganizerDashboard.jsx
│   │   │   ├── AgentWorkflowRunner.jsx
│   │   │   ├── ApprovalQueue.jsx
│   │   │   └── VendorDashboard.jsx
│   │   ├── App.jsx                  # React Router routes
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── mobile/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/                  # Dart model classes
│   │   ├── screens/
│   │   │   ├── events_list_screen.dart
│   │   │   ├── event_detail_screen.dart
│   │   │   └── qr_checkin_screen.dart
│   │   └── services/
│   │       └── api_service.dart     # HTTP service layer
│   └── pubspec.yaml
│
└── docker-compose.yml               # Local PostgreSQL container
```

---

## Database Schema

The PostgreSQL schema (`database/schema.sql`) implements **16 tables**, **6 custom ENUM types**, and **13 optimized indexes**.

### ENUMs

| ENUM | Values |
|---|---|
| `user_role` | `Organizer`, `VendorVenueManager`, `Attendee`, `Admin` |
| `event_status` | `Draft`, `Published`, `Ongoing`, `Completed`, `Cancelled` |
| `booking_status` | `Requested`, `Confirmed`, `Rejected`, `Completed` |
| `registration_status` | `Registered`, `Confirmed`, `CheckedIn`, `NoShow` |
| `expense_status` | `Pending`, `Approved`, `Paid`, `Rejected` |
| `workflow_status` | `Running`, `PausedForApproval`, `Completed`, `Failed` |
| `approval_status` | `NotRequired`, `Pending`, `Approved`, `Rejected` |

### Core Tables

| Table | Purpose |
|---|---|
| `users` | All roles — organizers, vendors, attendees, admins |
| `events` | Event records with status lifecycle |
| `ticket_types` | Ticket tiers per event (price, quantity, sold count) |
| `tickets` | Issued tickets with unique QR codes |
| `registrations` | Attendee <-> Event registrations with status |
| `check_ins` | QR scan records (duplicate prevention) |
| `notifications` | Email/SMS log |
| `venues` | Venue catalog (capacity, price/hour) |
| `vendors` | Vendor catalog (service type, price/service) |
| `vendor_bookings` | Venue/vendor booking requests per event |
| `budgets` | Per-event budget allocation |
| `expenses` | Budget line items with approval workflow |
| `payments` | Payment records (Stripe reference) |
| `approval_requests` | Manual approval queue for over-threshold items |
| `agent_workflows` | AI workflow state per event |
| `agent_execution_logs` | Per-agent step input/output/tool-call records |

---

## Backend API

Built with **ASP.NET Core 8** + **Entity Framework Core** + **Npgsql**. Swagger UI available at `/swagger`.

### Controllers

#### `EventsController` — `/api/events`

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/events` | List all events (filter by status/category) |
| `GET` | `/api/events/{id}` | Get event by ID with ticket types |
| `POST` | `/api/events` | Create a new event (Organizer) |
| `PUT` | `/api/events/{id}/status` | Update event status lifecycle |
| `GET` | `/api/events/{id}/ticket-types` | List ticket tiers |
| `POST` | `/api/events/{id}/ticket-types` | Add ticket tier |
| `POST` | `/api/events/{id}/ticket-types/{typeId}/purchase` | Purchase ticket (auto sold-out close) |

#### `RegistrationsController` — `/api/registrations`

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/registrations` | Register attendee for event |
| `GET` | `/api/registrations/{id}` | Get registration detail |
| `POST` | `/api/registrations/{id}/checkin` | QR check-in (duplicate prevention) |
| `GET` | `/api/events/{id}/registrations` | List registrations for an event |

#### `VenuesVendorsController` — `/api/venues` & `/api/vendors`

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/venues` | List active venues |
| `POST` | `/api/venues` | Create venue (VendorVenueManager) |
| `GET` | `/api/vendors` | List active vendors |
| `POST` | `/api/vendors` | Create vendor |
| `POST` | `/api/vendor-bookings` | Request venue/vendor booking |
| `PUT` | `/api/vendor-bookings/{id}/status` | Confirm / reject booking (conflict-check) |

#### `BudgetsController` — `/api/budgets`

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/budgets` | Create budget for event |
| `GET` | `/api/budgets/{id}` | Get budget + expense summary |
| `POST` | `/api/budgets/{id}/expenses` | Add expense (triggers approval if over threshold) |
| `PUT` | `/api/expenses/{id}/status` | Approve / reject expense |
| `GET` | `/api/approval-requests` | Pending approval queue |
| `PUT` | `/api/approval-requests/{id}` | Human approve / reject |

#### `AgentWorkflowController` — `/api/agent`

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/agent/workflow` | Start a new 4-agent planning workflow |
| `POST` | `/api/agent/workflow/{id}/approve` | Resume paused workflow (approve/reject) |
| `GET` | `/api/agent/workflow/{id}` | Get workflow status + execution logs |

---

## Agentic AI Subsystem

The agent service runs as a **separate FastAPI process** on port 8000. It implements the **minimum assessed workflow** (the 4-agent chain).

### Agent Roles

| Agent | File | Responsibility | Tools |
|---|---|---|---|
| **Planner** | `planner_agent.py` | Generates a structured event plan from the objective | — |
| **Domain Analysis** | `domain_analysis_agent.py` | Ranks venues/vendors by capacity fit, cost fit, location, availability | `search_venues`, `search_vendors`, `check_availability` |
| **Action** | `action_agent.py` | Tentatively reserves top venue/vendor, drafts QR tickets, sends notification | `reserve_venue`, `generate_qr_ticket`, `send_notification` |
| **Validation/Safety** | `validation_agent.py` | Checks estimated cost vs. budget; pauses workflow if over 80% threshold | — |

### Workflow States

```
Running → PausedForApproval → Completed
        ↘ Failed
```

### Agent Execution Logs

Every agent step records:
- `agent_name` — which agent ran
- `input` — structured input parameters
- `output` — structured output (ranked venues, booking details, validation result)
- `tool_calls` — list of tools invoked
- `timestamp` — UTC ISO-8601

This mirrors the `agent_execution_logs` table in PostgreSQL.

### Testing the Agent Chain Standalone

```bash
cd agents
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Quick smoke test via Python
python -c "
import orchestrator
result = orchestrator.run_workflow(
    'wf-test-01',
    'Plan a 100-person product launch, budget \$3000',
    100, 3000,
    '2027-06-01T09:00:00Z',
    'Downtown'
)
print(result['status'], result['paused_for_approval'])
"
```

### Agent Service API

| Method | Route | Body | Description |
|---|---|---|---|
| `POST` | `/workflow/run` | `{workflow_id, objective, capacity, budget, event_date, location}` | Run full 4-agent chain |
| `POST` | `/workflow/resume` | `{workflow_id, approved}` | Resume a paused workflow |
| `GET` | `/health` | — | Health check |

---

## Web Application

Built with **React 18 + Vite 5 + React Router v6**.

### Pages & Routes

| Route | Component | Role |
|---|---|---|
| `/` | `EventsList` | All users — browse published events |
| `/events/:id` | `EventDetail` | View event, register, see ticket types |
| `/organizer` | `OrganizerDashboard` | Create/manage events, view registrations |
| `/agent` | `AgentWorkflowRunner` | Run the 4-agent AI planner, approve/reject paused workflows |
| `/approvals` | `ApprovalQueue` | Budget approval queue for over-threshold expenses |
| `/vendor` | `VendorDashboard` | Manage venues, vendors, and booking requests |

### Running the Web App

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

The API client in `src/api/client.js` points to `http://localhost:5000/api` by default.

---

## Mobile Application

Built with **Flutter (Dart SDK ≥3.3)** targeting Android and iOS.

### Screens

| Screen | File | Features |
|---|---|---|
| **Events List** | `events_list_screen.dart` | Browse events, pull-to-refresh, navigate to detail or QR scanner |
| **Event Detail** | `event_detail_screen.dart` | View event info, registration status, ticket details |
| **QR Check-in** | `qr_checkin_screen.dart` | Camera-based QR scan → check-in confirmation (duplicate prevention) |

### Key Dependencies

| Package | Purpose |
|---|---|
| `http` | REST API calls to ASP.NET Core |
| `mobile_scanner` | Camera QR code scanning |
| `qr_flutter` | QR code generation from ticket data |
| `provider` | Lightweight state management |

### Running the Mobile App

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
# Use 10.0.2.2 for Android emulator -> host localhost
# Use your machine LAN IP for physical devices
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Docker Desktop | Latest |
| .NET SDK | 8.0+ |
| Python | 3.11+ |
| Node.js | 20+ |
| Flutter SDK | 3.3+ (optional, for mobile) |

### 1. Start the Database

```bash
# From project root
docker compose up -d postgres
```

PostgreSQL starts on port **5432** with the schema pre-applied from `database/schema.sql`.

### 2. Start the Agent Service

```bash
cd agents
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/health`

### 3. Start the Backend API

```bash
cd backend/EventManagement.Api

# First time: create and apply EF Core migration
dotnet ef migrations add Init
dotnet ef database update

# Run the API
dotnet run
```

- API: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/swagger`

### 4. Start the Web App

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`

### 5. Run the Mobile App (optional)

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
```

---

## Environment Variables

### Backend (`appsettings.json`)

| Key | Default | Description |
|---|---|---|
| `ConnectionStrings:Default` | `Host=localhost;Port=5432;Database=event_management;Username=postgres;Password=postgres` | PostgreSQL connection string |
| `AgentServiceUrl` | `http://localhost:8000` | Internal Python agent service URL |
| `Jwt:Key` | *(replace in production)* | JWT signing secret |
| `Jwt:ExpiryMinutes` | `120` | Token lifetime |

### Mobile (Dart defines)

| Key | Default | Description |
|---|---|---|
| `API_BASE_URL` | `http://10.0.2.2:5000/api` | Backend API base URL for Android emulator |

---

## API Reference

Full Swagger/OpenAPI docs available at `http://localhost:5000/swagger` once the backend is running.

### Key Request Examples

**Create an Event**
```json
POST /api/events
{
  "organizerId": "uuid",
  "title": "Annual Tech Summit",
  "description": "...",
  "category": "Technology",
  "startDate": "2027-03-15T09:00:00Z",
  "endDate": "2027-03-15T18:00:00Z",
  "location": "Downtown Convention Center",
  "capacity": 500
}
```

**Run Agent Workflow**
```json
POST /api/agent/workflow
{
  "organizerId": "uuid",
  "objective": "Plan a 100-person product launch, budget $3000",
  "capacity": 100,
  "budget": 3000,
  "eventDate": "2027-06-01T09:00:00Z",
  "location": "Downtown"
}
```

**Register for an Event**
```json
POST /api/registrations
{
  "eventId": "uuid",
  "attendeeId": "uuid",
  "ticketTypeId": "uuid"
}
```

**QR Check-in**
```json
POST /api/registrations/{id}/checkin
{
  "qrCode": "QR-abc12345"
}
```

---

## Component Ownership

This project follows a **4-student team model**. Each student owns end-to-end responsibility for their component.

| Student | Component | Backend Controller(s) | Web Pages | Mobile Screens | Core Entities |
|---|---|---|---|---|---|
| **Student 1** | Event Creation & Ticketing | `EventsController` | `EventsList`, `EventDetail`, `OrganizerDashboard` | `EventsListScreen`, `EventDetailScreen` | `Event`, `TicketType`, `Ticket` |
| **Student 2** | Venue & Vendor Booking | `VenuesVendorsController` | `VendorDashboard` | — | `Venue`, `Vendor`, `VendorBooking` |
| **Student 3** | Attendee Registration & Check-in | `RegistrationsController` | (registration in `EventDetail`) | `QrCheckInScreen` | `Registration`, `CheckIn`, `Notification` |
| **Student 4** | Budget & Payments | `BudgetsController` | `ApprovalQueue` | — | `Budget`, `Expense`, `Payment`, `ApprovalRequest` |

The **AI Planner** (`AgentWorkflowRunner` page + `AgentWorkflowController` + all 4 agent files) is a shared team deliverable.

---

## Whats Implemented vs Stubbed

### Fully Implemented

- **Full CRUD** for events, ticket types, venues, vendors, budgets, expenses, registrations
- **Business logic**:
  - Sold-out auto-close when `sold >= quantity` on ticket purchase
  - Venue double-booking conflict check on booking confirmation
  - QR duplicate check-in prevention
  - Budget threshold auto-approval (expenses <= 80% of budget total auto-approved; over -> `ApprovalRequest` created)
- **4-agent chain** — end-to-end tested: Planner -> Domain Analysis -> Action -> Validation with in-memory workflow state
- **Human-in-the-loop approval** — workflow pauses and resumes via `POST /api/agent/workflow/{id}/approve`
- **React routing** across all 4 role areas
- **Flutter QR scanning** using `mobile_scanner` with camera permission handling

### Stubbed / Ready to Wire

| Feature | Current State | What's Needed |
|---|---|---|
| **JWT Authentication** | Config section exists (`Jwt:Key`), `JwtBearer` package installed | Add `/auth/login` endpoint + `[Authorize(Roles="...")]` on controllers |
| **Venue/vendor search in agents** | In-memory mock list in `domain_analysis_agent.py` | Replace with real `GET /api/venues`, `GET /api/vendors` HTTP calls |
| **Email/SMS notifications** | `send_notification()` in `action_agent.py` returns a mock object | Wire to SendGrid/Twilio SDK |
| **Stripe payments** | `Payment` entity and table exist | Add Stripe SDK, create checkout session on ticket purchase |
| **EF Core migrations** | Models and `AppDbContext` complete | Run `dotnet ef migrations add Init && dotnet ef database update` |

---

## Roadmap and Next Steps

1. **Add EF Core migration**
   ```bash
   dotnet ef migrations add Init --project backend/EventManagement.Api
   dotnet ef database update --project backend/EventManagement.Api
   ```
   Reference `database/schema.sql` to verify the generated migration matches.

2. **Wire real authentication** — Add a `/auth/login` endpoint that validates credentials and issues a JWT; add `[Authorize(Roles = "Organizer")]` etc. to controllers.

3. **Connect agent venue/vendor search** — Replace the `_MOCK_VENUES` / `_MOCK_VENDORS` lists in `domain_analysis_agent.py` with real `httpx` calls to `GET /api/venues` and `GET /api/vendors`.

4. **Integrate third-party services**:
   - **SendGrid** for email notifications (replace `send_notification` mock)
   - **Twilio** for SMS notifications
   - **Stripe Test Mode** for payment processing

5. **Write the Architecture Decision Record (ADR)** — Document the agent framework choice. The current scaffold uses a plain Python/FastAPI orchestrator (swappable for LangGraph or Google ADK) while keeping the same HTTP contract with ASP.NET Core.

6. **Add CI/CD pipeline** — GitHub Actions for `dotnet build`, `npm run build`, `python -m pytest`.

7. **Containerize all services** — Extend `docker-compose.yml` to include the backend API and agent service containers.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Follow the component ownership table — coordinate with the owning student before modifying another component's files
4. Write tests for any new business logic
5. Submit a pull request with a clear description

---

## License

This project is for educational purposes. See individual dependencies for their respective licenses.
