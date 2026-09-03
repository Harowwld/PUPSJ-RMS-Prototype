-- Evidence-based OCR and student-match scoring fields.
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS ocr_quality_score NUMERIC(5,4);
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS match_evidence JSONB;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS match_method TEXT;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS match_status TEXT;
