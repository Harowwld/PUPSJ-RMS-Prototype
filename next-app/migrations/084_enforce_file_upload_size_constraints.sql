-- Migration 084: Enforce file upload size limits across database tables (Local PostgreSQL)
-- 26,214,400 bytes = 25 MB hard ceiling for document records, ingest queues, attachments, and student organization files.

-- 1. documents table
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_size_bytes_check;
ALTER TABLE documents ADD CONSTRAINT documents_size_bytes_check CHECK (size_bytes >= 0 AND size_bytes <= 26214400);

-- 2. ingest_queue table
ALTER TABLE ingest_queue DROP CONSTRAINT IF EXISTS ingest_queue_size_bytes_check;
ALTER TABLE ingest_queue ADD CONSTRAINT ingest_queue_size_bytes_check CHECK (size_bytes >= 0 AND size_bytes <= 26214400);

-- 3. document_request_attachments table
ALTER TABLE document_request_attachments DROP CONSTRAINT IF EXISTS doc_req_attachments_size_bytes_check;
ALTER TABLE document_request_attachments ADD CONSTRAINT doc_req_attachments_size_bytes_check CHECK (size_bytes >= 0 AND size_bytes <= 26214400);

-- 4. event_proposals table
ALTER TABLE event_proposals DROP CONSTRAINT IF EXISTS event_proposals_size_bytes_check;
ALTER TABLE event_proposals ADD CONSTRAINT event_proposals_size_bytes_check CHECK (size_bytes >= 0 AND size_bytes <= 26214400);

-- 5. organization_bylaws_versions table
ALTER TABLE organization_bylaws_versions DROP CONSTRAINT IF EXISTS organization_bylaws_versions_size_bytes_check;
ALTER TABLE organization_bylaws_versions ADD CONSTRAINT organization_bylaws_versions_size_bytes_check CHECK (size_bytes IS NULL OR (size_bytes >= 0 AND size_bytes <= 26214400));

-- 6. scan_session_incoming table
ALTER TABLE scan_session_incoming DROP CONSTRAINT IF EXISTS scan_session_incoming_size_bytes_check;
ALTER TABLE scan_session_incoming ADD CONSTRAINT scan_session_incoming_size_bytes_check CHECK (size_bytes IS NULL OR (size_bytes >= 0 AND size_bytes <= 26214400));
