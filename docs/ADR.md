# Architecture Decision Record — EventFlow

This document records the key technical decisions for the EventFlow event-management platform, per SE3090 Assignment 1 Section 14.2. Each entry follows: Context → Options Considered → Decision → Consequences.

---

## ADR-01: React State Management — Context API over Redux Toolkit / Zustand

**Context.** The React web app needs to share the logged-in user/JWT across every page (protected routes, role-gated navigation, API auth headers) and to a lesser extent share event/venue lists between a few sibling pages. The app has four role-based dashboards but no deeply nested state that changes at high frequency (no live collaborative editing, no complex derived-state graphs).

**Options considered.**
- **Redux Toolkit** — industry-standard, strong devtools, but adds a store/slice/selector layer that is unjustified overhead for state this simple (essentially one object: the current user).
- **Zustand** — lighter than Redux, but still an external dependency for what boils down to "who is logged in" plus page-local `useState`/`useEffect` data fetching.
- **React Context API** (chosen) — built into React, zero extra dependencies, and the one piece of genuinely cross-cutting state (auth session) fits its single-provider model exactly.

**Decision.** Use `AuthContext` (`web/src/context/AuthContext.jsx`) as the only global store, backed by `localStorage` for persistence across reloads. All other state (event lists, form drafts, workflow results) is local to the page/component that owns it and fetched directly from the API via `web/src/api/client.js`.

**Consequences.** Simple to reason about and zero extra bundle size, but this only remains a good choice as long as cross-page shared state stays limited to auth. If a future feature needs state shared across many unrelated pages (e.g. a shopping-cart-like flow), Context re-render behavior would need revisiting (Context has no selective-subscription optimization the way Redux/Zustand do).

---

## ADR-02: Flutter State Management — `ValueNotifier` + `StatefulWidget` over Provider/Riverpod/Bloc

**Context.** The Flutter app's dependency list already included `provider: ^6.1.2`, but the actual state surface is small: one piece of app-wide state (the logged-in `AuthUser`, gating navigation between the login screen and the main shell) plus per-screen loading/data/error state (events list, tickets list, scan result) that doesn't need to be shared outside its own screen.

**Options considered.**
- **flutter_bloc** — most structured, best for large teams and complex business rules, but its ceremony (events → bloc → states) is disproportionate to this app's actual complexity.
- **Riverpod** — solves Provider's context-lookup footguns, but is a heavier dependency than needed here.
- **Provider package** — already a dependency, would work, but for a single piece of app-wide state a plain `ChangeNotifier`/`ValueNotifier` achieves the same result without the extra `Provider`/`Consumer` widget wrapping.
- **`ValueNotifier` + `ValueListenableBuilder`** (chosen) — part of the Flutter SDK itself, no extra package needed for the one thing that's genuinely global (auth session), with ordinary `StatefulWidget`/`setState` for everything screen-local.

**Decision.** `AuthService.instance.userNotifier` (a `ValueNotifier<AuthUser?>`) is the single source of app-wide state; `AuthGate` in `main.dart` listens to it via `ValueListenableBuilder` to switch between `LoginScreen` and the main navigation shell. Every other screen (`EventsListScreen`, `MyTicketsScreen`, `QrCheckInScreen`) manages its own fetch/loading/error state locally with `StatefulWidget`.

**Consequences.** Minimal dependency footprint and easy to follow for a 3-screen app. This would need to be revisited (likely toward Riverpod or Bloc) if the app grows enough shared state that `ValueNotifier` plumbing becomes repetitive across many unrelated screens.

---

## ADR-03: Agentic AI Framework — Custom Python/FastAPI Orchestrator over LangGraph / Microsoft Agent Framework

**Context.** Section 9 requires at least four distinct agents (planning/coordination, domain analysis, action/tool-use, validation/safety) with structured plan → delegate → tool-call → validate → human-approval-gate → auditable-result flow, callable only from ASP.NET Core (never directly from React/Flutter).

**Options considered.**
- **LangGraph** — the framework used in labs; gives graph-based orchestration, built-in state persistence patterns, and a large ecosystem, at the cost of a steeper learning curve and a dependency on an LLM-centric graph abstraction that this workflow's actual logic (deterministic scoring, HTTP calls, budget rules) doesn't need.
- **Microsoft Agent Framework / Google ADK** — similarly capable, but neither offered a clear advantage over a simpler approach for a workflow whose "intelligence" is mostly deterministic business logic (venue scoring, budget-threshold checks) rather than open-ended LLM reasoning.
- **Custom Python/FastAPI orchestrator** (chosen) — each agent is a plain Python module (`agents/agents/{planner,domain_analysis,action,validation}_agent.py`) with an explicit input/output contract and an allow-listed set of tool functions; `orchestrator.py` sequences them and logs each step. FastAPI exposes exactly two endpoints (`/workflow/run`, `/workflow/resume`) that are the only interface ASP.NET Core needs.

**Decision.** Use the custom orchestrator. It satisfies every element of the minimum assessed workflow (structured plan, four distinct agents with clear responsibilities/contracts, allow-listed tool calls to the real backend, deterministic validation, a human-approval pause, and a persisted, auditable log) without pulling in an LLM-graph framework whose main value-add (flexible multi-step LLM reasoning) isn't what this particular workflow's logic actually needs. The framework choice is intentionally swappable later: the HTTP contract between ASP.NET Core and the agent service (`/workflow/run`, `/workflow/resume`) would stay identical if the internals were migrated to LangGraph.

**Consequences.** Full control and transparency over every step (useful for the viva, since every line of "agent" logic is plain, readable Python) and no LLM API costs/latency/non-determinism in the golden-case tests. The tradeoff is that this orchestrator does not use an actual LLM for reasoning — venue "matching" is a deterministic scoring formula, not a language model's judgment call. This was an explicit choice for reliability and testability (Section 12's "must not be the only evaluation method... rule-based assertions... deterministic validators" is easiest to satisfy when the underlying logic is itself deterministic) rather than a limitation we ran out of time to address.

---

## ADR-04: Database Schema Strategy for Agent Workflow State — Structured Columns + JSON Blob, not Event Sourcing

**Context.** Section 9.1 requires persisting "the workflow ID, objective, plan, completed steps, tool results, validation results, errors, approval status, and final outcome in structured, durable storage" — but explicitly forbids storing hidden reasoning, secrets, or unnecessary sensitive data (Section 6).

**Options considered.**
- **Full event-sourcing** (an append-only table of every state transition, workflow state derived by replay) — gives a complete audit trail by construction, but is significant extra complexity (projections, replay logic) for a workflow with only ~5 possible states.
- **One row per workflow with a single opaque JSON blob for everything** — simplest to write, but makes status filtering/reporting (e.g. "show all workflows pending approval") require parsing JSON in application code instead of a simple `WHERE` clause.
- **Structured columns for queryable state + JSON for the variable-shaped plan/log payloads** (chosen) — `AgentWorkflow` has real columns for `Status`, `ApprovalStatus`, `CurrentStep`, `EventId`, `CreatedAt`/`CompletedAt` (so `WHERE Status = 'PausedForApproval'` works directly in SQL/EF), plus a `PlanJson` text column holding the full structured response from the Python service (ranked venues, booking, validation, per-agent logs) since that payload's shape varies per workflow and doesn't need individual columns. A separate `AgentExecutionLog` table has one row per agent step (`AgentName`, `InputJson`, `OutputJson`, `ToolCallsJson`, `Timestamp`), giving a genuine per-step audit trail without full event sourcing.

**Decision.** Structured columns for anything the UI/API needs to filter or sort on, JSON columns for the variable-shaped agent payloads, and a dedicated `AgentExecutionLog` table (not just a JSON array inside `AgentWorkflow`) so execution history is independently queryable (`GET /api/agent-workflows/{id}/logs`) and durable across the Python service's own process lifetime. No raw model reasoning, prompts, tokens, or secrets are stored — only structured input/output/tool-call records (see `AgentWorkflowController.PersistNewLogsAsync`), consistent with Section 6.

**Consequences.** Query-friendly and satisfies the durability requirement (approval can be resolved via `PlanJson` even if the Python process restarts and loses its in-memory workflow dict — see `orchestrator.resume_workflow`'s `prior_state` parameter). The tradeoff is that `PlanJson`'s internal shape isn't enforced by the database schema (it's a text column), so a future breaking change to the agent service's response shape wouldn't be caught by an EF Core migration — only by the integration tests.

---

## ADR-05: Cloud Deployment Platform — Supabase (PostgreSQL) + [TBD: React/API host]

**Context.** Section 14 requires the API on a suitable cloud platform with a working health/Swagger URL, the database deployed securely with restricted credentials, and the React app deployed with a live URL — all achievable with institution-provided or no-cost services.

**Decision.** PostgreSQL is hosted on **Supabase** (already provisioned prior to this session). The direct-connection hostname (`db.<project>.supabase.co`) resolves to an IPv6 address only; if the deployment target lacks IPv6 egress, use Supabase's **connection pooler** hostname instead (Project Settings → Database → Connection Pooling), which is IPv4-reachable. The React app's deployment target (e.g. Vercel, given `web/vercel.json` already exists in the repo) and the ASP.NET Core API's hosting target should be recorded here once finalized by the group — this entry is intentionally left open for the team to complete with their actual chosen platforms, consistent with "institution-provided or no-cost services."

**Consequences.** Supabase's free tier is sufficient for this assignment's scale and gives a managed Postgres with backups/dashboard access without cost. The IPv6-only direct-connection quirk is a real, previously-undiagnosed deployment risk (discovered when local development from a network without IPv6 egress could not reach the direct hostname) — teams deploying to a host without IPv6 must use the pooler connection string or the deployment will silently fail to connect.

---

*Three to six decisions is the suggested range per the spec; this ADR is deliberately scoped to the decisions with the clearest tradeoffs. Extend it with entries for third-party integration choice (Section 11) or CI/CD tooling if the group wants additional coverage before submission.*
