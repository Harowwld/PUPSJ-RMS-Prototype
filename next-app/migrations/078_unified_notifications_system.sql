-- 078_unified_notifications_system.sql
-- Unified notifications table supporting document reviews, document requests,
-- batch uploads, student record events, and system alerts.

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  office_id TEXT REFERENCES offices(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'document_review', 'document_request', 'scan_upload', 'student_record', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  actor_name TEXT,
  actor_id TEXT,
  entity_type TEXT, -- 'document', 'document_request', 'student', 'system'
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_notification_reads (
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_office_created_at
  ON notifications(office_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type_created_at
  ON notifications(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_entity
  ON notifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_staff_notification_reads_staff
  ON staff_notification_reads(staff_id, is_read);

-- Backfill reviewed documents
INSERT INTO notifications (office_id, type, title, message, severity, actor_name, actor_id, entity_type, entity_id, metadata, created_at)
SELECT
  d.office_id,
  'document_review',
  CASE WHEN d.approval_status = 'Approved' THEN 'Document Approved: ' || d.doc_type ELSE 'Document Declined: ' || d.doc_type END,
  CASE WHEN d.approval_status = 'Approved' 
    THEN COALESCE(d.reviewed_by, 'Admin') || ' approved ' || d.doc_type || ' for student ' || COALESCE(d.student_name, d.student_no) || ' (' || d.student_no || ')'
    ELSE COALESCE(d.reviewed_by, 'Admin') || ' declined ' || d.doc_type || ' for student ' || COALESCE(d.student_name, d.student_no) || ' (' || d.student_no || ')' || CASE WHEN d.review_note IS NOT NULL AND d.review_note != '' THEN ': "' || d.review_note || '"' ELSE '' END
  END,
  CASE WHEN d.approval_status = 'Approved' THEN 'success' ELSE 'error' END,
  d.reviewed_by,
  NULL,
  'document',
  d.id::text,
  jsonb_build_object(
    'document_id', d.id,
    'student_no', d.student_no,
    'student_name', d.student_name,
    'doc_type', d.doc_type,
    'original_filename', d.original_filename,
    'approval_status', d.approval_status,
    'reviewed_by', d.reviewed_by,
    'reviewed_at', d.reviewed_at,
    'review_note', d.review_note,
    'is_previewed', d.is_previewed,
    'mime_type', d.mime_type
  ),
  COALESCE(d.reviewed_at, d.created_at, NOW())
FROM documents d
WHERE d.reviewed_at IS NOT NULL AND d.approval_status IN ('Approved', 'Declined')
ON CONFLICT DO NOTHING;

-- Backfill document requests
INSERT INTO notifications (office_id, type, title, message, severity, actor_name, actor_id, entity_type, entity_id, metadata, created_at)
SELECT
  dr.office_id,
  'document_request',
  'Document Request: ' || dr.doc_type || ' (' || dr.status || ')',
  'Request #' || dr.id || ' for ' || dr.doc_type || ' (' || COALESCE(dr.requester_name, dr.student_no, 'Student') || ') is ' || dr.status,
  CASE 
    WHEN dr.status = 'Completed' THEN 'success'
    WHEN dr.status = 'Ready' THEN 'success'
    WHEN dr.status = 'Cancelled' THEN 'error'
    WHEN dr.status = 'Deficient' THEN 'warning'
    ELSE 'info'
  END,
  COALESCE(dr.updated_by, dr.created_by, 'System'),
  NULL,
  'document_request',
  dr.id::text,
  jsonb_build_object(
    'request_id', dr.id,
    'student_no', dr.student_no,
    'requester_name', dr.requester_name,
    'doc_type', dr.doc_type,
    'status', dr.status,
    'notes', dr.notes,
    'client_type', dr.client_type,
    'created_at', dr.created_at,
    'updated_at', dr.updated_at
  ),
  COALESCE(dr.updated_at, dr.created_at, NOW())
FROM document_requests dr
ON CONFLICT DO NOTHING;

-- Backfill read states from legacy staff_notification_item_states
INSERT INTO staff_notification_reads (staff_id, notification_id, is_read, updated_at)
SELECT
  nis.staff_id,
  n.id,
  nis.is_read,
  nis.updated_at
FROM staff_notification_item_states nis
JOIN notifications n ON n.entity_type = 'document' AND n.entity_id = nis.notification_id::text
ON CONFLICT (staff_id, notification_id) DO UPDATE SET
  is_read = EXCLUDED.is_read,
  updated_at = EXCLUDED.updated_at;
