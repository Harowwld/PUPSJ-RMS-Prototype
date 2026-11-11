-- Student session subjects identify portal accounts. Resolve their current
-- Registrar record link before allowing access to physical records.
ALTER POLICY student_self_read ON students
  USING (
    current_setting('app.current_role', true) = 'Student'
    AND EXISTS (
      SELECT 1
        FROM student_accounts sa
       WHERE sa.id::text = current_setting('app.current_user_id', true)
         AND sa.student_no = students.student_no
    )
  );

ALTER POLICY student_document_read ON documents
  USING (
    current_setting('app.current_role', true) = 'Student'
    AND EXISTS (
      SELECT 1
        FROM student_accounts sa
       WHERE sa.id::text = current_setting('app.current_user_id', true)
         AND sa.student_no = documents.student_no
    )
  );
