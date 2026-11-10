CREATE INDEX IF NOT EXISTS idx_document_requests_office_created_at
  ON document_requests(office_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_post_event_reports_created_at
  ON osas_post_event_reports(created_at DESC, id DESC);
