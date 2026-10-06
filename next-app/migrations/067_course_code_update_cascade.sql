-- Keep course blocks attached when an administrator changes a course code.
ALTER TABLE sections
  DROP CONSTRAINT IF EXISTS sections_office_id_course_code_fkey;

ALTER TABLE sections
  ADD CONSTRAINT sections_office_id_course_code_fkey
  FOREIGN KEY (office_id, course_code)
  REFERENCES courses(office_id, code)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
