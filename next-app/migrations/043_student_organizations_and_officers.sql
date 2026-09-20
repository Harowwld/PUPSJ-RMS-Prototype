-- Migration 043: Student Organizations, Constitution & By-Laws (CBL), and Officer Whitelists for OSAS
-- Establishes the organization-centric architecture for OSAS records keeping.

-- 1. Create student_organizations table
CREATE TABLE IF NOT EXISTS student_organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  acronym TEXT,
  category TEXT NOT NULL DEFAULT 'Academic',
  status TEXT NOT NULL DEFAULT 'Active',
  adviser_name TEXT,
  adviser_email TEXT,
  description TEXT,
  bylaws_storage_filename TEXT,
  bylaws_original_filename TEXT,
  bylaws_size_bytes BIGINT,
  bylaws_mime_type TEXT DEFAULT 'application/pdf',
  bylaws_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_orgs_status ON student_organizations(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_student_orgs_category ON student_organizations(category);

-- 2. Create organization_officers table (whitelist)
CREATE TABLE IF NOT EXISTS organization_officers (
  id BIGSERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES student_organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  student_no TEXT,
  student_name TEXT,
  position TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_org_officer_email UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_officers_email ON organization_officers(lower(email));
CREATE INDEX IF NOT EXISTS idx_org_officers_org_id ON organization_officers(organization_id);

-- 3. Enhance event_proposals table for organization-centric tracking
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES student_organizations(id) ON DELETE SET NULL;
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS submitted_by_email TEXT;
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS officer_position TEXT;
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS is_verified_officer BOOLEAN DEFAULT FALSE;
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS student_account_id BIGINT REFERENCES student_accounts(id) ON DELETE SET NULL;

-- Allow nullable student_no for proposals submitted via student account email
ALTER TABLE event_proposals ALTER COLUMN student_no DROP NOT NULL;
ALTER TABLE event_proposals DROP CONSTRAINT IF EXISTS event_proposals_student_no_fkey;
ALTER TABLE event_proposals
  ADD CONSTRAINT event_proposals_student_no_fkey
  FOREIGN KEY (student_no) REFERENCES students(student_no)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_event_proposals_org_id ON event_proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_proposals_submitted_email ON event_proposals(lower(submitted_by_email));

-- 4. Register module 'student_organizations' in modules table
INSERT INTO modules (id, name, description, category, icon, sidebar_group, sort_order, is_system, component_key)
VALUES (
  'student_organizations',
  'Student Organizations',
  'Manage recognized student organizations, Constitution & By-Laws (CBL), and officer whitelists',
  'staff',
  'ph-bold ph-buildings',
  'Operations',
  8,
  FALSE,
  'StudentOrganizationsTab'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sidebar_group = EXCLUDED.sidebar_group,
  sort_order = EXCLUDED.sort_order,
  component_key = EXCLUDED.component_key;

-- Enable for OSAS office; disable for Registrar office
INSERT INTO office_modules (office_id, module_id, enabled)
VALUES ('osas', 'student_organizations', TRUE)
ON CONFLICT (office_id, module_id) DO UPDATE SET enabled = TRUE;

INSERT INTO office_modules (office_id, module_id, enabled)
VALUES ('registrar', 'student_organizations', FALSE)
ON CONFLICT (office_id, module_id) DO NOTHING;

-- 5. Seed recognized student organizations
INSERT INTO student_organizations (id, name, acronym, category, status, adviser_name, adviser_email, description)
VALUES
  (
    'helping-hands',
    'Helping Hands Community Organization',
    'HHCO',
    'Non-Academic',
    'Active',
    'Dr. Maria Santos',
    'maria.santos@pup.local',
    'Dedicated to student community outreach, volunteerism, and civic empowerment across PUP San Juan and surrounding communities.'
  ),
  (
    'jpcs',
    'Junior Philippine Computer Society',
    'JPCS',
    'Academic',
    'Active',
    'Prof. Juan Dela Cruz',
    'juan.delacruz@pup.local',
    'Official academic student organization for Computer Science and Information Technology students at PUP San Juan.'
  ),
  (
    'ssc',
    'Supreme Student Council',
    'SSC',
    'Non-Academic',
    'Active',
    'Dean Roberto Gomez',
    'roberto.gomez@pup.local',
    'The apex student governing body representing all student councils and organizations of PUP San Juan.'
  ),
  (
    'rcy',
    'Red Cross Youth - PUPSJ Chapter',
    'RCY',
    'Non-Academic',
    'Active',
    'Ms. Elena Torres',
    'elena.torres@pup.local',
    'Promoting humanitarian values, youth leadership, first aid readiness, and health advocacy.'
  ),
  (
    'gaming-guild',
    'PUPSJ Esports & Gaming Guild',
    'PSJ-EGG',
    'Non-Academic',
    'Active',
    'Engr. Kevin Lim',
    'kevin.lim@pup.local',
    'Fostering competitive esports, game design interest, and digital recreation within PUP San Juan.'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  acronym = EXCLUDED.acronym,
  category = EXCLUDED.category,
  adviser_name = EXCLUDED.adviser_name,
  adviser_email = EXCLUDED.adviser_email,
  description = EXCLUDED.description;

-- 6. Seed default whitelisted officers
-- Seed marianocedrick412@gmail.com as President for Helping Hands
INSERT INTO organization_officers (organization_id, email, student_name, position, status)
VALUES
  ('helping-hands', 'marianocedrick412@gmail.com', 'Cedrick Mariano', 'President', 'Active'),
  ('helping-hands', 'test.student@pup.local', 'Test Student', 'Secretary', 'Active'),
  ('jpcs', 'test.student@pup.local', 'Test Student', 'Vice President', 'Active')
ON CONFLICT (organization_id, email) DO UPDATE SET
  position = EXCLUDED.position,
  student_name = EXCLUDED.student_name,
  status = EXCLUDED.status;
