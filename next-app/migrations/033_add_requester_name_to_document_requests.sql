-- Migration 033: Add requester_name to document_requests for alumni/non-student requests
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS requester_name TEXT;

-- Backfill requester_name from students where student_no matches
UPDATE document_requests dr
SET requester_name = s.name
FROM students s
WHERE dr.student_no = s.student_no AND dr.requester_name IS NULL;

-- Backfill requester_name from student_accounts where student_account_id matches
UPDATE document_requests dr
SET requester_name = COALESCE(NULLIF(TRIM(CONCAT_WS(' ', sa.first_name, sa.last_name)), ''), sa.email)
FROM student_accounts sa
WHERE dr.student_account_id = sa.id AND dr.requester_name IS NULL;
