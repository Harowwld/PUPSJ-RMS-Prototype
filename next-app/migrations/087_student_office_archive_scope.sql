ALTER TABLE student_office_memberships
  DROP CONSTRAINT IF EXISTS student_office_memberships_status_check;

ALTER TABLE student_office_memberships
  ADD CONSTRAINT student_office_memberships_status_check
  CHECK (status IN ('Active', 'Inactive', 'Archived'));

-- Preserve legacy globally archived records as archived in every assigned office.
UPDATE student_office_memberships som
   SET status = 'Archived', updated_at = NOW()
  FROM students s
 WHERE s.student_no = som.student_no
   AND s.status = 'Archived'
   AND som.status = 'Active';

UPDATE students s
   SET status = 'Active', updated_at = NOW()
 WHERE s.status = 'Archived'
   AND EXISTS (
     SELECT 1 FROM student_office_memberships som
      WHERE som.student_no = s.student_no AND som.status = 'Archived'
   );
