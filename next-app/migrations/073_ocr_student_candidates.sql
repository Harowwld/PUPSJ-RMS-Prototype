-- Store strict OCR suggestions separately from staff-confirmed assignment.
ALTER TABLE ingest_queue
  ADD COLUMN IF NOT EXISTS ocr_student_candidates JSONB NOT NULL DEFAULT '[]'::jsonb;
