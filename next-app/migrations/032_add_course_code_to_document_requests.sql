-- 032_add_course_code_to_document_requests.sql
-- Add course_code to document_requests to track student/alumni academic program (e.g. BSIT, BSBA)
-- especially for alumni without student numbers.

ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS course_code TEXT;

-- Backfill existing requests with course_code from students table if student_no is present
UPDATE document_requests dr
SET course_code = s.course_code
FROM students s
WHERE dr.student_no = s.student_no 
  AND dr.course_code IS NULL
  AND s.course_code IS NOT NULL;
