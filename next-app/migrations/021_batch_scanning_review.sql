-- Batch scanning and review-first fields for the PostgreSQL ingest queue.
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS office_id TEXT REFERENCES offices(id) ON DELETE SET NULL;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS ocr_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS ocr_text TEXT;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS ocr_name TEXT;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS proposed_student_no TEXT;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS proposed_doc_type TEXT;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(5,4);
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS match_candidates JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'Processing';
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS review_note TEXT;

UPDATE ingest_queue SET office_id = COALESCE(office_id, 'registrar') WHERE office_id IS NULL;
UPDATE ingest_queue SET review_status = CASE
  WHEN status = 'promoted' THEN 'Confirmed'
  WHEN status = 'failed' THEN 'Failed'
  ELSE COALESCE(NULLIF(review_status, ''), 'Processing')
END;

CREATE INDEX IF NOT EXISTS idx_ingest_queue_batch_status
  ON ingest_queue(batch_id, review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_queue_review_status
  ON ingest_queue(review_status, created_at DESC);
