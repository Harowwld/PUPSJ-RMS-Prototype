-- Migration 051: OSAS Post-Event Compliance & Constitution & By-Laws (CBL) Versioning
-- Expands OSAS into a complete governance and compliance suite.

-- 1. Enhance event_proposals with post-event reporting lifecycle fields
ALTER TABLE event_proposals 
  ADD COLUMN IF NOT EXISTS post_event_status TEXT DEFAULT 'Not Applicable' 
    CHECK (post_event_status IN ('Not Applicable', 'Pending Submission', 'Submitted', 'Under Review', 'Needs Revision', 'Cleared', 'Overdue')),
  ADD COLUMN IF NOT EXISTS post_event_due_date DATE,
  ADD COLUMN IF NOT EXISTS post_event_cleared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_event_cleared_by TEXT REFERENCES staff(id);

CREATE INDEX IF NOT EXISTS idx_event_proposals_post_event_status ON event_proposals(post_event_status);

-- 2. Create osas_post_event_reports table
CREATE TABLE IF NOT EXISTS osas_post_event_reports (
  id BIGSERIAL PRIMARY KEY,
  event_proposal_id BIGINT NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES student_organizations(id) ON DELETE RESTRICT,
  submitted_by_email TEXT NOT NULL,
  actual_attendance INTEGER DEFAULT 0 CHECK (actual_attendance >= 0),
  total_expenses NUMERIC(12, 2) DEFAULT 0.00 CHECK (total_expenses >= 0),
  narrative_storage_filename TEXT NOT NULL,
  narrative_original_filename TEXT NOT NULL,
  liquidation_storage_filename TEXT,
  liquidation_original_filename TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' 
    CHECK (status IN ('Submitted', 'Under Review', 'Needs Revision', 'Cleared', 'Declined')),
  review_note TEXT,
  reviewed_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_event_proposal_id ON osas_post_event_reports(event_proposal_id);
CREATE INDEX IF NOT EXISTS idx_post_event_org_id ON osas_post_event_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_post_event_status ON osas_post_event_reports(status);

-- 3. Create organization_bylaws_versions table for CBL submissions & versioning
CREATE TABLE IF NOT EXISTS organization_bylaws_versions (
  id BIGSERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES student_organizations(id) ON DELETE CASCADE,
  version_tag TEXT NOT NULL, -- e.g. "2026-Rev1", "Baseline Ratification"
  storage_filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  amendment_summary TEXT,
  submitted_by_email TEXT,
  approved_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pending' 
    CHECK (status IN ('Pending', 'Approved', 'Needs Revision', 'Declined', 'Superseded')),
  review_note TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bylaws_versions_org_id ON organization_bylaws_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_bylaws_versions_status ON organization_bylaws_versions(status);

-- 4. Backfill baseline CBL versions from existing student_organizations
INSERT INTO organization_bylaws_versions (
  organization_id, version_tag, storage_filename, original_filename, amendment_summary, status, effective_date, created_at
)
SELECT 
  id, 
  'Baseline Ratification', 
  bylaws_storage_filename, 
  COALESCE(bylaws_original_filename, name || '-CBL.pdf'), 
  'Initial baseline Constitution & By-Laws on file with OSAS.', 
  'Approved',
  COALESCE(bylaws_updated_at::DATE, CURRENT_DATE),
  COALESCE(bylaws_updated_at, NOW())
FROM student_organizations
WHERE bylaws_storage_filename IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Backfill existing approved proposals with post-event lifecycle requirements
UPDATE event_proposals
SET 
  post_event_status = 'Pending Submission',
  post_event_due_date = COALESCE(event_date + INTERVAL '10 days', (created_at + INTERVAL '10 days')::DATE)
WHERE status = 'Approved' AND post_event_status = 'Not Applicable';
