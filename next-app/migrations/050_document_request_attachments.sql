-- Migration 050: Document Request Attachments and Parent/Guardian SPA Support

-- 1. Create document_request_attachments table
CREATE TABLE IF NOT EXISTS document_request_attachments (
  id BIGSERIAL PRIMARY KEY,
  document_request_id BIGINT NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  attachment_type TEXT NOT NULL DEFAULT 'evidence', -- 'spa', 'valid_id', 'evidence', 'receipt', 'clearance', 'other'
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_req_attachments_req_id ON document_request_attachments(document_request_id);

-- 2. Add Parent / Guardian and SPA verification metadata columns to document_requests
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS requester_relationship TEXT;
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS requester_contact TEXT;
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS spa_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS spa_verified_by TEXT;
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS spa_verified_at TIMESTAMPTZ;
