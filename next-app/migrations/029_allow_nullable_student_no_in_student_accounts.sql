-- 029_allow_nullable_student_no_in_student_accounts.sql
-- Allow student_accounts to have NULL student_no when students register without one
-- Introduce primary key id for student_accounts
-- Link document_requests with student_account_id

-- 1. Add id column to student_accounts if not exists
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS id BIGSERIAL;

-- 2. Drop existing primary key on student_no if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_accounts_pkey' AND conrelid = 'student_accounts'::regclass
  ) THEN
    ALTER TABLE student_accounts DROP CONSTRAINT student_accounts_pkey;
  END IF;
END $$;

-- 3. Set id as primary key
ALTER TABLE student_accounts ADD CONSTRAINT student_accounts_pkey PRIMARY KEY (id);

-- 4. Drop foreign key constraint on student_no
ALTER TABLE student_accounts DROP CONSTRAINT IF EXISTS student_accounts_student_no_fkey;

-- 5. Make student_no nullable in student_accounts
ALTER TABLE student_accounts ALTER COLUMN student_no DROP NOT NULL;

-- 6. Add foreign key back with ON DELETE SET NULL
ALTER TABLE student_accounts 
  ADD CONSTRAINT student_accounts_student_no_fkey 
  FOREIGN KEY (student_no) REFERENCES students(student_no) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Add student_account_id to document_requests
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS student_account_id BIGINT REFERENCES student_accounts(id) ON DELETE SET NULL;

-- 8. Backfill student_account_id on document_requests
UPDATE document_requests dr
SET student_account_id = sa.id
FROM student_accounts sa
WHERE dr.student_no = sa.student_no
  AND dr.student_account_id IS NULL;

-- 9. Clean up temporary ALUM- identifiers from student_accounts so they are empty
UPDATE student_accounts
SET student_no = NULL
WHERE student_no LIKE 'ALUM-%';
