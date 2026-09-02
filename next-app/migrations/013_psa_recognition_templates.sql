CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS recognition_templates (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  document_type_id BIGINT NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  page_index INTEGER NOT NULL DEFAULT 0 CHECK (page_index >= 0),
  rotation INTEGER NOT NULL DEFAULT 0 CHECK (rotation IN (0, 90, 180, 270)),
  regions JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  created_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (office_id, document_type_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_recognition_templates_lookup
  ON recognition_templates (office_id, document_type_id, status);
