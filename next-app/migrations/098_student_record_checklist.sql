CREATE TABLE student_checklist_verifications (
  account_id BIGINT PRIMARY KEY REFERENCES student_accounts(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE CHECK (reference ~ '^[A-F0-9]{12}$'),
  requested_student_no TEXT NOT NULL,
  verified_student_no TEXT REFERENCES students(student_no) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Verified', 'Declined')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  CHECK ((status = 'Verified') = (verified_student_no IS NOT NULL))
);

CREATE TABLE registrar_checklist_receipts (
  student_no TEXT NOT NULL REFERENCES students(student_no) ON DELETE CASCADE,
  document_type_id BIGINT NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  recorded_by TEXT REFERENCES staff(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_no, document_type_id)
);

-- The checklist sets this flag only for the lifetime of its status query.
-- A checklist verification grants no access through other document queries.
ALTER POLICY student_document_read ON documents
  USING (
    office_id = 'registrar'
    AND current_setting('app.current_role', true) = 'Student'
    AND current_setting('app.checklist_status_read', true) = 'on'
    AND (
      EXISTS (
        SELECT 1 FROM student_accounts account
        WHERE account.id::text = current_setting('app.current_user_id', true)
          AND account.student_no = documents.student_no
      )
      OR EXISTS (
        SELECT 1 FROM student_checklist_verifications verification
        WHERE verification.account_id::text = current_setting('app.current_user_id', true)
          AND verification.status = 'Verified'
          AND verification.verified_student_no = documents.student_no
      )
    )
  );
