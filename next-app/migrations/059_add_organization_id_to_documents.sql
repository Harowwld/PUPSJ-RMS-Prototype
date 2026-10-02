-- Migration 059: Add organization_id to documents table
-- Enables polymorphic document management where documents can link to recognized student organizations in OSAS.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES student_organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_office_org ON documents(office_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
