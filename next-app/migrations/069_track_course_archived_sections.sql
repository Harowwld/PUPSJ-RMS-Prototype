ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS course_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing course archive operations marked their active sections Archived in
-- the same request. Record that legacy relationship so restoring the course
-- can reactivate those sections.
UPDATE sections AS s
   SET course_archived = TRUE
  FROM courses AS c
 WHERE s.office_id = c.office_id
   AND s.course_code = c.code
   AND s.status = 'Archived'
   AND c.status = 'Archived';
