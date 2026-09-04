-- 028_student_client_type_and_name_fields.sql
-- Add separated name fields and client_type to student_accounts
-- Add client_type to document_requests
-- Update foreign keys on students(student_no) to ON UPDATE CASCADE

-- 1. Add columns to student_accounts
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'Student';

-- 2. Add client_type to document_requests
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'Student';

-- 3. Update foreign key constraints to ON UPDATE CASCADE
-- student_accounts
ALTER TABLE student_accounts DROP CONSTRAINT IF EXISTS student_accounts_student_no_fkey;
ALTER TABLE student_accounts 
  ADD CONSTRAINT student_accounts_student_no_fkey 
  FOREIGN KEY (student_no) REFERENCES students(student_no) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- documents
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_student_no_fkey;
ALTER TABLE documents 
  ADD CONSTRAINT documents_student_no_fkey 
  FOREIGN KEY (student_no) REFERENCES students(student_no) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- document_requests
ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_student_no_fkey;
ALTER TABLE document_requests 
  ADD CONSTRAINT document_requests_student_no_fkey 
  FOREIGN KEY (student_no) REFERENCES students(student_no) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- event_proposals
ALTER TABLE event_proposals DROP CONSTRAINT IF EXISTS event_proposals_student_no_fkey;
ALTER TABLE event_proposals 
  ADD CONSTRAINT event_proposals_student_no_fkey 
  FOREIGN KEY (student_no) REFERENCES students(student_no) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Backfill name and client_type in student_accounts from students
DO $$
DECLARE
  rec RECORD;
  parsed_fname TEXT;
  parsed_lname TEXT;
  parsed_mname TEXT;
  tokens TEXT[];
  name_part TEXT;
BEGIN
  FOR rec IN 
    SELECT sa.student_no, s.name, s.course_code
    FROM student_accounts sa
    JOIN students s ON s.student_no = sa.student_no
  LOOP
    parsed_fname := NULL;
    parsed_lname := NULL;
    parsed_mname := NULL;

    IF rec.name IS NOT NULL AND TRIM(rec.name) <> '' THEN
      IF rec.name LIKE '%,%' THEN
        parsed_lname := TRIM(SPLIT_PART(rec.name, ',', 1));
        name_part := TRIM(SPLIT_PART(rec.name, ',', 2));
        tokens := STRING_TO_ARRAY(name_part, ' ');
        IF ARRAY_LENGTH(tokens, 1) > 1 AND LENGTH(tokens[ARRAY_LENGTH(tokens, 1)]) <= 2 THEN
          parsed_mname := tokens[ARRAY_LENGTH(tokens, 1)];
          tokens := tokens[1:ARRAY_LENGTH(tokens, 1)-1];
          parsed_fname := ARRAY_TO_STRING(tokens, ' ');
        ELSE
          parsed_fname := name_part;
        END IF;
      ELSE
        tokens := STRING_TO_ARRAY(TRIM(rec.name), ' ');
        IF ARRAY_LENGTH(tokens, 1) > 1 THEN
          parsed_lname := tokens[ARRAY_LENGTH(tokens, 1)];
          tokens := tokens[1:ARRAY_LENGTH(tokens, 1)-1];
          parsed_fname := ARRAY_TO_STRING(tokens, ' ');
        ELSE
          parsed_fname := TRIM(rec.name);
          parsed_lname := '';
        END IF;
      END IF;
    END IF;

    UPDATE student_accounts
    SET 
      first_name = COALESCE(first_name, parsed_fname, ''),
      middle_name = COALESCE(middle_name, parsed_mname, ''),
      last_name = COALESCE(last_name, parsed_lname, ''),
      client_type = CASE 
        WHEN rec.course_code = 'ALUMNI' OR rec.student_no LIKE 'ALUM-%' THEN 'Alumni' 
        ELSE 'Student' 
      END
    WHERE student_no = rec.student_no;
  END LOOP;
END $$;

-- 5. Backfill client_type in document_requests
UPDATE document_requests dr
SET client_type = COALESCE(sa.client_type, CASE WHEN s.course_code = 'ALUMNI' OR s.student_no LIKE 'ALUM-%' THEN 'Alumni' ELSE 'Student' END)
FROM students s
LEFT JOIN student_accounts sa ON sa.student_no = s.student_no
WHERE dr.student_no = s.student_no;
