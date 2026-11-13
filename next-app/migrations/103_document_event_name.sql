ALTER TABLE documents ADD COLUMN IF NOT EXISTS event_name TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_osas_event_duplicate
  ON documents (office_id, organization_id, student_no, doc_type, lower(trim(coalesce(event_name, ''))))
  WHERE office_id = 'osas';
