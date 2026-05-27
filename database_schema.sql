-- ============================================================================
-- BeyondSure Sales CRM — Database Schema
-- ============================================================================
-- This SQL schema is the relational (PostgreSQL) equivalent of the
-- Firestore NoSQL collections used in the CRM application.
--
-- Collections mapped:
--   Firestore          →  PostgreSQL Table
--   ─────────────────────────────────────
--   users              →  users
--   leads              →  leads
--   activities         →  activities
--   settings           →  settings
--
-- Compatible with: PostgreSQL 15+
-- ============================================================================


-- ─── USERS ──────────────────────────────────────────────────────────────────
-- Stores all CRM user accounts.
-- Each row maps to a Firebase Auth user (uid = Firebase Auth UID).
-- Roles: admin, team_lead, employee

CREATE TABLE users (
    uid             VARCHAR(128)    PRIMARY KEY,                -- Firebase Auth UID
    name            VARCHAR(255)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    role            VARCHAR(20)     NOT NULL DEFAULT 'employee'
                                    CHECK (role IN ('admin', 'team_lead', 'employee')),
    team_lead_id    VARCHAR(128)    REFERENCES users(uid)       -- Employees only: which TL they belong to
                                    ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Index for quick lookups by role and team
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_team_lead ON users(team_lead_id);

COMMENT ON TABLE  users IS 'All CRM users — admins, team leads, and employees';
COMMENT ON COLUMN users.uid IS 'Primary key — matches the Firebase Auth UID';
COMMENT ON COLUMN users.email IS 'Must be @beyondsure.* or @insurance4life.* (any TLD)';
COMMENT ON COLUMN users.role IS 'One of: admin, team_lead, employee';
COMMENT ON COLUMN users.team_lead_id IS 'FK to users.uid — only set for employees';


-- ─── LEADS ──────────────────────────────────────────────────────────────────
-- Stores all sales leads managed in the CRM.
-- Statuses follow the pipeline: New Lead → Contacted → … → Won / Lost

CREATE TABLE leads (
    id                  VARCHAR(64)     PRIMARY KEY,            -- nanoid()
    full_name           VARCHAR(255)    NOT NULL,
    phone               VARCHAR(20),                            -- 10-digit phone number
    email               VARCHAR(255),
    company             VARCHAR(255),
    business_type       VARCHAR(100),
    lead_source         VARCHAR(50)     NOT NULL DEFAULT 'Other'
                                        CHECK (lead_source IN (
                                            'Agent', 'Broker', 'IMF', 'Advisor',
                                            'MF Distributor', 'CA', 'NBFC', 'Other'
                                        )),
    assigned_to         VARCHAR(255),                           -- Display name of assigned user
    assigned_to_uid     VARCHAR(128)    REFERENCES users(uid)   -- FK to users table
                                        ON DELETE SET NULL,
    created_by_uid      VARCHAR(128)    REFERENCES users(uid)   -- FK — who created this lead
                                        ON DELETE SET NULL,
    status              VARCHAR(50)     NOT NULL DEFAULT 'New Lead'
                                        CHECK (status IN (
                                            'New Lead', 'Contacted', 'Interested',
                                            'Follow-up', 'Negotiation',
                                            'Post Demo Follow-Up', 'Post Commercial Follow-Up',
                                            'Won', 'Lost'
                                        )),
    followup_date       DATE,                                   -- Scheduled follow-up date
    followup_time       VARCHAR(5),                             -- HH:MM (24h stored, AM/PM displayed)
    followup_status     VARCHAR(20)     CHECK (followup_status IN ('Ongoing', 'Completed')),
    lost_reason         VARCHAR(50)     CHECK (lost_reason IN ('Not Eligible', 'Budget Constraint')),
    website_link        TEXT,
    notes               TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to_uid);
CREATE INDEX idx_leads_created_by ON leads(created_by_uid);
CREATE INDEX idx_leads_followup_date ON leads(followup_date);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

COMMENT ON TABLE  leads IS 'All sales leads tracked in the CRM';
COMMENT ON COLUMN leads.id IS 'Unique ID generated via nanoid()';
COMMENT ON COLUMN leads.lead_source IS 'Agent, Broker, IMF, Advisor, MF Distributor, CA, NBFC, or Other';
COMMENT ON COLUMN leads.status IS 'Pipeline stage: New Lead → Contacted → … → Won / Lost';
COMMENT ON COLUMN leads.followup_time IS 'Stored in 24h HH:MM format, displayed as AM/PM in UI';
COMMENT ON COLUMN leads.lost_reason IS 'Only set when status = Lost';


-- ─── ACTIVITIES ─────────────────────────────────────────────────────────────
-- Immutable audit log of all actions performed on leads.
-- ⚠️ NO UPDATE OR DELETE is ever allowed on this table.
-- Activities are auto-logged when status changes, follow-ups are scheduled, etc.

CREATE TABLE activities (
    id                  VARCHAR(64)     PRIMARY KEY,            -- nanoid()
    lead_id             VARCHAR(64)     NOT NULL
                                        REFERENCES leads(id)
                                        ON DELETE CASCADE,
    activity_type       VARCHAR(50)     NOT NULL
                                        CHECK (activity_type IN (
                                            'Call', 'Meeting', 'Note',
                                            'Status Update', 'Follow-up Update'
                                        )),
    description         TEXT            NOT NULL,
    performed_by_uid    VARCHAR(128)    REFERENCES users(uid)
                                        ON DELETE SET NULL,
    performed_by_name   VARCHAR(255),
    performed_by_role   VARCHAR(20)     CHECK (performed_by_role IN ('admin', 'team_lead', 'employee')),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_actor ON activities(performed_by_uid);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_date ON activities(created_at DESC);

COMMENT ON TABLE  activities IS '🔒 IMMUTABLE audit log — no UPDATE or DELETE allowed';
COMMENT ON COLUMN activities.activity_type IS 'Call, Meeting, Note, Status Update, or Follow-up Update';
COMMENT ON COLUMN activities.description IS 'Human-readable description, e.g. Status changed from "New Lead" to "Contacted"';


-- ─── SETTINGS ───────────────────────────────────────────────────────────────
-- Application-level settings (admin-configured).

CREATE TABLE settings (
    id          VARCHAR(100)    PRIMARY KEY,                    -- Setting key
    value       JSONB           NOT NULL DEFAULT '{}',          -- Flexible JSON value
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE settings IS 'Admin-only application settings';


-- ============================================================================
-- SECURITY POLICIES (Row-Level Security for RBAC)
-- ============================================================================
-- These policies mirror the Firestore security rules.
-- Enable RLS on all tables and create policies per role.
-- ============================================================================

-- Enable Row-Level Security
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;


-- ─── USERS TABLE POLICIES ───────────────────────────────────────────────────
-- Read:   Any authenticated user
-- Create: Admin + Team Lead
-- Update: Admin only
-- Delete: Admin + Team Lead

-- (These would be implemented via application-level middleware in Express.js
--  since the React app communicates through a REST API on EC2.)


-- ─── LEADS TABLE POLICIES ───────────────────────────────────────────────────
-- Read:   Any authenticated user (filtered client-side by role)
-- Create: Any authenticated user
-- Update: Any authenticated user
-- Delete: Admin + Team Lead only


-- ─── ACTIVITIES TABLE POLICIES ──────────────────────────────────────────────
-- Read:   Any authenticated user
-- Create: Any authenticated user
-- Update: ❌ NEVER — immutable audit trail
-- Delete: ❌ NEVER — no one can delete activity logs

-- To enforce immutability at the database level:
CREATE OR REPLACE FUNCTION prevent_activity_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Activities are immutable. UPDATE and DELETE are not allowed.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activities_no_update
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION prevent_activity_modification();

CREATE TRIGGER trg_activities_no_delete
    BEFORE DELETE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION prevent_activity_modification();


-- ─── SETTINGS TABLE POLICIES ────────────────────────────────────────────────
-- Read:  Any authenticated user
-- Write: Admin only


-- ============================================================================
-- AUTO-UPDATE updated_at TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- ============================================================================
-- SUMMARY
-- ============================================================================
--
-- Tables Created:
--   1. users         — CRM users (admin, team_lead, employee)
--   2. leads         — Sales leads with full pipeline tracking
--   3. activities    — 🔒 Immutable audit log (triggers block UPDATE/DELETE)
--   4. settings      — Admin-configurable app settings
--
-- Indexes: 12 indexes for optimized queries
-- Triggers: 4 triggers (2 for immutability, 2 for auto-timestamps)
-- Constraints: CHECK constraints on all enum-like columns
--
-- ============================================================================
