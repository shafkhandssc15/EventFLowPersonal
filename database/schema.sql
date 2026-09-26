-- Event Management Platform — PostgreSQL Schema
-- Matches Section 4 (ER Diagram) of the project plan

CREATE TYPE user_role AS ENUM ('Organizer', 'VendorVenueManager', 'Attendee', 'Admin');
CREATE TYPE event_status AS ENUM ('Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled');
CREATE TYPE booking_status AS ENUM ('Requested', 'Confirmed', 'Rejected', 'Completed');
CREATE TYPE registration_status AS ENUM ('Registered', 'Confirmed', 'CheckedIn', 'NoShow');
CREATE TYPE expense_status AS ENUM ('Pending', 'Approved', 'Paid', 'Rejected');
CREATE TYPE workflow_status AS ENUM ('Running', 'PausedForApproval', 'Completed', 'Failed');
CREATE TYPE approval_status AS ENUM ('NotRequired', 'Pending', 'Approved', 'Rejected');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(200) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE budgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID, -- FK added after events table exists
    total_budget    NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id    UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ NOT NULL,
    location        VARCHAR(300),
    capacity        INT NOT NULL CHECK (capacity > 0),
    status          event_status NOT NULL DEFAULT 'Draft',
    budget_id       UUID REFERENCES budgets(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE budgets ADD CONSTRAINT fk_budgets_event FOREIGN KEY (event_id) REFERENCES events(id);

CREATE TABLE ticket_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    price           NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantity        INT NOT NULL,
    sold            INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_type_id  UUID NOT NULL REFERENCES ticket_types(id),
    attendee_id     UUID NOT NULL REFERENCES users(id),
    qr_code         VARCHAR(255) NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id),
    attendee_id     UUID NOT NULL REFERENCES users(id),
    ticket_id       UUID REFERENCES tickets(id),
    status          registration_status NOT NULL DEFAULT 'Registered',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE check_ins (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id     UUID NOT NULL REFERENCES registrations(id),
    checked_in_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    method              VARCHAR(50) NOT NULL DEFAULT 'QR'
);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    channel         VARCHAR(20) NOT NULL, -- Email | SMS
    subject         VARCHAR(200),
    body            TEXT,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE venues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(200) NOT NULL,
    location        VARCHAR(300),
    capacity        INT NOT NULL,
    price_per_hour  NUMERIC(10,2) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(200) NOT NULL,
    service_type    VARCHAR(100),
    price_per_service NUMERIC(10,2) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendor_bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id),
    vendor_id       UUID REFERENCES vendors(id),
    venue_id        UUID REFERENCES venues(id),
    status          booking_status NOT NULL DEFAULT 'Requested',
    cost            NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id       UUID NOT NULL REFERENCES budgets(id),
    category        VARCHAR(100) NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    status          expense_status NOT NULL DEFAULT 'Pending',
    approved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id      UUID REFERENCES expenses(id),
    ticket_id       UUID REFERENCES tickets(id),
    amount          NUMERIC(12,2) NOT NULL,
    provider        VARCHAR(50) NOT NULL DEFAULT 'StripeTest',
    provider_ref    VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE approval_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id      UUID REFERENCES expenses(id),
    vendor_booking_id UUID REFERENCES vendor_bookings(id),
    requested_by    UUID REFERENCES users(id),
    status          approval_status NOT NULL DEFAULT 'Pending',
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE TABLE agent_workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID REFERENCES events(id),
    objective       TEXT NOT NULL,
    plan            JSONB,
    status          workflow_status NOT NULL DEFAULT 'Running',
    current_step    VARCHAR(100),
    approval_status approval_status NOT NULL DEFAULT 'NotRequired',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE agent_execution_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id         UUID NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    agent_name          VARCHAR(100) NOT NULL,
    action              VARCHAR(200) NOT NULL,
    input               JSONB,
    output              JSONB,
    tool_calls          JSONB,
    validation_result   JSONB,
    "timestamp"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_vendor_bookings_event ON vendor_bookings(event_id);
CREATE INDEX idx_vendor_bookings_status ON vendor_bookings(status);
CREATE INDEX idx_expenses_budget ON expenses(budget_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_agent_workflows_event ON agent_workflows(event_id);
CREATE INDEX idx_agent_logs_workflow ON agent_execution_logs(workflow_id);
CREATE UNIQUE INDEX idx_users_email ON users(email);
