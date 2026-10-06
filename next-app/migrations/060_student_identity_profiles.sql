-- Centralize student-facing identity details while retaining account and
-- academic records as separate entities.
CREATE TABLE student_identity_profiles (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  display_name TEXT,
  email TEXT,
  client_type TEXT NOT NULL DEFAULT 'Student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE students ADD COLUMN identity_profile_id BIGINT;
ALTER TABLE student_accounts ADD COLUMN identity_profile_id BIGINT;

-- Temporary source keys let this transactional migration preserve the exact
-- row-to-profile mapping even where encrypted email values are NULL.
ALTER TABLE student_identity_profiles ADD COLUMN migration_account_id BIGINT;
INSERT INTO student_identity_profiles (
  first_name, middle_name, last_name, email, client_type, migration_account_id
)
SELECT sa.first_name, sa.middle_name, sa.last_name, sa.email,
       COALESCE(NULLIF(sa.client_type, ''), 'Student'), sa.id
FROM student_accounts sa;

UPDATE student_accounts sa
SET identity_profile_id = sip.id
FROM student_identity_profiles sip
WHERE sip.migration_account_id = sa.id;

WITH primary_student_accounts AS (
  SELECT DISTINCT ON (student_no) student_no, identity_profile_id
  FROM student_accounts
  WHERE student_no IS NOT NULL
  ORDER BY student_no, id
)
UPDATE students s
SET identity_profile_id = psa.identity_profile_id
FROM primary_student_accounts psa
WHERE psa.student_no = s.student_no;

UPDATE student_identity_profiles sip
SET display_name = s.name
FROM students s
WHERE s.identity_profile_id = sip.id
  AND sip.display_name IS NULL;

ALTER TABLE student_identity_profiles ADD COLUMN migration_student_no TEXT;
INSERT INTO student_identity_profiles (display_name, client_type, migration_student_no)
SELECT s.name, 'Student', s.student_no
FROM students s
WHERE s.identity_profile_id IS NULL;

UPDATE students s
SET identity_profile_id = sip.id
FROM student_identity_profiles sip
WHERE sip.migration_student_no = s.student_no;

ALTER TABLE student_identity_profiles DROP COLUMN migration_account_id;
ALTER TABLE student_identity_profiles DROP COLUMN migration_student_no;

CREATE UNIQUE INDEX idx_student_identity_profiles_email
  ON student_identity_profiles(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_students_identity_profile
  ON students(identity_profile_id);
CREATE UNIQUE INDEX idx_student_accounts_identity_profile
  ON student_accounts(identity_profile_id);

ALTER TABLE students ALTER COLUMN identity_profile_id SET NOT NULL;
ALTER TABLE student_accounts ALTER COLUMN identity_profile_id SET NOT NULL;
ALTER TABLE students
  ADD CONSTRAINT students_identity_profile_fk
  FOREIGN KEY (identity_profile_id) REFERENCES student_identity_profiles(id) ON DELETE RESTRICT;
ALTER TABLE student_accounts
  ADD CONSTRAINT student_accounts_identity_profile_fk
  FOREIGN KEY (identity_profile_id) REFERENCES student_identity_profiles(id) ON DELETE RESTRICT;

CREATE FUNCTION ensure_student_identity_profile() RETURNS trigger AS $$
DECLARE
  existing_profile_id BIGINT;
BEGIN
  IF NEW.identity_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'students' THEN
    SELECT identity_profile_id INTO existing_profile_id
      FROM students WHERE student_no = NEW.student_no;
    IF existing_profile_id IS NOT NULL THEN
      NEW.identity_profile_id := existing_profile_id;
    ELSE
      INSERT INTO student_identity_profiles (display_name)
      VALUES (NEW.name) RETURNING id INTO NEW.identity_profile_id;
    END IF;
    RETURN NEW;
  END IF;

  SELECT identity_profile_id INTO existing_profile_id
    FROM student_accounts WHERE email = NEW.email AND email IS NOT NULL;
  IF existing_profile_id IS NULL AND NEW.student_no IS NOT NULL THEN
    SELECT s.identity_profile_id INTO existing_profile_id
      FROM students s
     WHERE s.student_no = NEW.student_no
       AND NOT EXISTS (
         SELECT 1 FROM student_accounts linked
         WHERE linked.identity_profile_id = s.identity_profile_id
       );
  END IF;
  IF existing_profile_id IS NOT NULL THEN
    NEW.identity_profile_id := existing_profile_id;
  ELSE
    INSERT INTO student_identity_profiles (first_name, middle_name, last_name, email, client_type)
    VALUES (NEW.first_name, NEW.middle_name, NEW.last_name, NEW.email,
            COALESCE(NULLIF(NEW.client_type, ''), 'Student'))
    RETURNING id INTO NEW.identity_profile_id;
  END IF;
  UPDATE student_identity_profiles
     SET first_name = NEW.first_name,
         middle_name = NEW.middle_name,
         last_name = NEW.last_name,
         email = NEW.email,
         client_type = COALESCE(NULLIF(NEW.client_type, ''), 'Student'),
         updated_at = NOW()
   WHERE id = NEW.identity_profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION sync_student_identity_profile() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'students' THEN
    UPDATE student_identity_profiles
       SET first_name = NULL,
           middle_name = NULL,
           last_name = NULL,
           display_name = NEW.name,
           updated_at = NOW()
     WHERE id = NEW.identity_profile_id;
  ELSE
    UPDATE student_identity_profiles
       SET first_name = NEW.first_name,
           middle_name = NEW.middle_name,
           last_name = NEW.last_name,
           email = NEW.email,
           client_type = COALESCE(NULLIF(NEW.client_type, ''), 'Student'),
           updated_at = NOW()
     WHERE id = NEW.identity_profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_identity_profile_insert
  BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION ensure_student_identity_profile();
CREATE TRIGGER student_accounts_identity_profile_insert
  BEFORE INSERT ON student_accounts
  FOR EACH ROW EXECUTE FUNCTION ensure_student_identity_profile();
CREATE TRIGGER students_identity_profile_update
  AFTER UPDATE OF name ON students
  FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION sync_student_identity_profile();
CREATE TRIGGER student_accounts_identity_profile_update
  AFTER UPDATE OF first_name, middle_name, last_name, email, client_type ON student_accounts
  FOR EACH ROW EXECUTE FUNCTION sync_student_identity_profile();
