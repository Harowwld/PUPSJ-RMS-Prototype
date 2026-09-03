-- Persist the recognition regions used by batch OCR so reviewers can see the
-- exact fields that produced the proposed name.
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS ocr_regions JSONB;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS ocr_page_index INTEGER;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS ocr_quality_score NUMERIC(5,4);
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS match_evidence JSONB;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS match_method TEXT;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS match_status TEXT;
