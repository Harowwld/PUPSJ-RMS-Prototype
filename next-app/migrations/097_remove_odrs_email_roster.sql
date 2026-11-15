-- Clean up databases that ran the draft roster migration.
DROP POLICY IF EXISTS odrs_signup_roster_student_read ON students;
DROP TABLE IF EXISTS odrs_registrar_emails;
ALTER TABLE student_accounts DROP COLUMN IF EXISTS odrs_verified_email_key;
DROP INDEX IF EXISTS idx_odrs_linked_student;
