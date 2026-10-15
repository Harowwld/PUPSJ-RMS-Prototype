-- OCR only extracts document fields. Student assignment is performed by staff.
ALTER TABLE ingest_queue DROP COLUMN IF EXISTS proposed_student_no;
ALTER TABLE ingest_queue DROP COLUMN IF EXISTS match_confidence;
ALTER TABLE ingest_queue DROP COLUMN IF EXISTS match_candidates;
ALTER TABLE ingest_queue DROP COLUMN IF EXISTS ocr_quality_score;
ALTER TABLE ingest_queue DROP COLUMN IF EXISTS match_evidence;
ALTER TABLE ingest_queue DROP COLUMN IF EXISTS match_method;
ALTER TABLE ingest_queue DROP COLUMN IF EXISTS match_status;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS staff_selected_student_no TEXT;
ALTER TABLE ingest_queue ADD COLUMN IF NOT EXISTS ocr_detected_rotation SMALLINT NOT NULL DEFAULT 0;
UPDATE ingest_queue SET review_status = 'Needs Review' WHERE review_status = 'Conflict';
