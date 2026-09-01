-- PostgreSQL storage for the scanner hot-folder inbox.
CREATE TABLE IF NOT EXISTS ingest_queue (
  id BIGSERIAL PRIMARY KEY,
  original_filename TEXT NOT NULL,
  storage_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  status TEXT NOT NULL DEFAULT 'pending',
  source_station TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
  last_error TEXT,
  content_sha256 TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingest_queue_status_created_at
  ON ingest_queue(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingest_queue_sha256
  ON ingest_queue(content_sha256);
