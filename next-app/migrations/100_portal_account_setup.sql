ALTER TABLE student_identity_profiles
  ADD COLUMN portal_setup_complete BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN portal_email_verified_at TIMESTAMPTZ;

CREATE TABLE registrar_odrs_contacts (
  student_no TEXT PRIMARY KEY REFERENCES students(student_no) ON DELETE CASCADE ON UPDATE CASCADE,
  email TEXT NOT NULL CONSTRAINT registrar_odrs_contacts_email_unique UNIQUE
);

CREATE INDEX registrar_odrs_contacts_number_idx ON registrar_odrs_contacts (upper(student_no));

-- The matching address belongs to the authenticated, email-verified portal account.
ALTER POLICY student_document_read ON documents USING (
  office_id = 'registrar'
  AND current_setting('app.current_role', true) = 'Student'
  AND current_setting('app.checklist_status_read', true) = 'on'
  AND current_setting('app.checklist_student_no', true) = documents.student_no
  AND EXISTS (
    SELECT 1 FROM student_accounts sa
    JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
    WHERE sa.id::text = current_setting('app.current_user_id', true)
      AND sip.portal_setup_complete AND sip.client_type = 'Student'
      AND (
        sa.student_no = documents.student_no
        OR EXISTS (
          SELECT 1 FROM student_checklist_verifications v
          WHERE v.account_id = sa.id AND v.status = 'Verified' AND v.verified_student_no = documents.student_no
        )
        OR (sip.portal_email_verified_at IS NOT NULL AND EXISTS (
          SELECT 1 FROM registrar_odrs_contacts contact
          WHERE contact.student_no = documents.student_no AND contact.email = sip.email
        ))
      )
  )
);

-- Prior signups used this event after successfully completing email verification.
UPDATE student_identity_profiles sip
SET portal_email_verified_at = sa.created_at
FROM student_accounts sa
WHERE sa.identity_profile_id = sip.id
  AND EXISTS (
    SELECT 1 FROM global_audit_logs audit
    WHERE audit.entity_type = 'student_account' AND audit.entity_id = sa.id::text
      AND audit.actor_id = sa.id::text AND audit.action = 'Student account registered'
      AND audit.details = 'Verified email and completed student account setup'
      AND audit.created_at BETWEEN sa.created_at AND sa.created_at + INTERVAL '15 minutes'
  );
