-- Migration 030: Allow nullable student_no in document_requests for alumni/students without student number
-- Enables document requests to be created without a student number when unknown,
-- relying on student_account_id for authentication and user tracking.

ALTER TABLE document_requests ALTER COLUMN student_no DROP NOT NULL;

-- Update foreign key constraint to permit setting null on deletion
ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_student_no_fkey;
ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_student_no_fkey
  FOREIGN KEY (student_no) REFERENCES students(student_no)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
