CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  accent_color TEXT NOT NULL DEFAULT '#800000',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT,
  sidebar_group TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  component_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS office_modules (
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB,
  sort_order INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (office_id, module_id)
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  office_id TEXT REFERENCES offices(id) ON DELETE SET NULL,
  fname TEXT NOT NULL,
  lname TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SuperAdmin', 'Admin', 'Staff')),
  section TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  password_last_changed TIMESTAMPTZ,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  student_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  course_code TEXT,
  year_level INTEGER,
  section TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  storage_room INTEGER,
  storage_cabinet TEXT,
  storage_drawer INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_accounts (
  student_no TEXT PRIMARY KEY REFERENCES students(student_no) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (office_id, code)
);

CREATE TABLE IF NOT EXISTS sections (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course_code TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (office_id, name, course_code),
  FOREIGN KEY (office_id, course_code) REFERENCES courses(office_id, code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS document_types (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_norm TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (office_id, name_norm)
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  student_no TEXT REFERENCES students(student_no) ON DELETE RESTRICT,
  student_name TEXT,
  doc_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  approval_status TEXT NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Declined')),
  reviewed_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  uploaded_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  is_previewed BOOLEAN NOT NULL DEFAULT FALSE,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (office_id, legacy_id)
);

CREATE TABLE IF NOT EXISTS document_requests (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  student_no TEXT NOT NULL REFERENCES students(student_no) ON DELETE RESTRICT,
  doc_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'InProgress', 'Ready', 'Completed', 'Cancelled')),
  notes TEXT,
  linked_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (office_id, legacy_id)
);

CREATE TABLE IF NOT EXISTS event_proposals (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL DEFAULT 'osas' REFERENCES offices(id) ON DELETE RESTRICT,
  student_no TEXT NOT NULL REFERENCES students(student_no) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  event_date DATE,
  venue TEXT,
  description TEXT,
  storage_filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type = 'application/pdf'),
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Needs Revision', 'Approved', 'Declined')),
  reviewed_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (office_id = 'osas')
);

CREATE TABLE IF NOT EXISTS transaction_updates (
  id BIGSERIAL PRIMARY KEY,
  document_request_id BIGINT REFERENCES document_requests(id) ON DELETE CASCADE,
  event_proposal_id BIGINT REFERENCES event_proposals(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  created_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((document_request_id IS NOT NULL)::INTEGER + (event_proposal_id IS NOT NULL)::INTEGER = 1)
);

CREATE TABLE IF NOT EXISTS global_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT REFERENCES offices(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  severity TEXT NOT NULL DEFAULT 'INFO',
  entity_type TEXT,
  entity_id TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_office_id ON staff(office_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_courses_office_code ON courses(office_id, code);
CREATE INDEX IF NOT EXISTS idx_documents_office_student ON documents(office_id, student_no);
CREATE INDEX IF NOT EXISTS idx_document_requests_office_status ON document_requests(office_id, status);
CREATE INDEX IF NOT EXISTS idx_event_proposals_status ON event_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_updates_request ON transaction_updates(document_request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_updates_proposal ON transaction_updates(event_proposal_id, created_at);

INSERT INTO offices (id, name, short_name, description, icon, accent_color)
VALUES
  ('registrar', 'Office of the Registrar', 'Registrar', 'Manages student academic records and document requests', 'ph-bold ph-certificate', '#E5484D'),
  ('osas', 'Office of Student Affairs and Services', 'OSAS', 'Manages student affairs records and event proposals', 'ph-bold ph-student', '#3B82F6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO modules (id, name, description, category, sort_order, is_system, component_key)
VALUES
  ('alumni_requests', 'Document Requests', 'Manage student and alumni document requests', 'staff', 1, FALSE, 'DocumentRequestsTab'),
  ('osas_monitoring', 'OSAS Monitoring', 'Review student event proposals and requirements', 'staff', 2, FALSE, 'OsasMonitoringTab'),
  ('documents', 'Documents', 'Manage office documents', 'staff', 3, FALSE, 'DocumentsTab'),
  ('notifications', 'Notifications', 'Staff notification center', 'staff', 4, TRUE, 'NotificationsTab'),
  ('staff_directory', 'Staff Directory', 'Manage office staff accounts', 'admin', 1, FALSE, 'StaffDirectoryTab'),
  ('audit_logs', 'Audit Log', 'Activity audit trail', 'admin', 2, TRUE, 'AuditLogsTab')
ON CONFLICT (id) DO NOTHING;

INSERT INTO office_modules (office_id, module_id, enabled)
SELECT o.id, m.id,
  CASE WHEN o.id = 'registrar' THEN m.id <> 'osas_monitoring'
       WHEN o.id = 'osas' THEN m.id <> 'alumni_requests'
       ELSE FALSE END
FROM offices o CROSS JOIN modules m
ON CONFLICT (office_id, module_id) DO NOTHING;
