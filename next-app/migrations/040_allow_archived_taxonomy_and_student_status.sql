-- Allow 'Archived' status for document_types, courses, sections, students, and student_accounts

ALTER TABLE document_types
  DROP CONSTRAINT IF EXISTS document_types_status_check;

ALTER TABLE document_types
  ADD CONSTRAINT document_types_status_check
  CHECK (status IN ('Active', 'Inactive', 'Archived'));

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_status_check;

ALTER TABLE courses
  ADD CONSTRAINT courses_status_check
  CHECK (status IN ('Active', 'Inactive', 'Archived'));

ALTER TABLE sections
  DROP CONSTRAINT IF EXISTS sections_status_check;

ALTER TABLE sections
  ADD CONSTRAINT sections_status_check
  CHECK (status IN ('Active', 'Inactive', 'Archived'));

ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_status_check;

ALTER TABLE students
  ADD CONSTRAINT students_status_check
  CHECK (status IN ('Active', 'Inactive', 'Archived'));

ALTER TABLE student_accounts
  DROP CONSTRAINT IF EXISTS student_accounts_status_check;

ALTER TABLE student_accounts
  ADD CONSTRAINT student_accounts_status_check
  CHECK (status IN ('Active', 'Inactive', 'Archived'));
