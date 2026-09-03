-- Sample Registrar configuration for the System Configuration data tab.
-- These inserts are idempotent and do not replace existing office data.
INSERT INTO courses (office_id, code, name, status)
VALUES
  ('registrar', 'BSIT', 'Bachelor of Science in Information Technology', 'Active'),
  ('registrar', 'BSCS', 'Bachelor of Science in Computer Science', 'Active')
ON CONFLICT (office_id, code) DO NOTHING;

INSERT INTO sections (office_id, name, course_code, status)
VALUES
  ('registrar', 'BSIT-4A', 'BSIT', 'Active'),
  ('registrar', 'BSIT-4B', 'BSIT', 'Active'),
  ('registrar', 'BSCS-3A', 'BSCS', 'Active')
ON CONFLICT (office_id, name, course_code) DO NOTHING;

INSERT INTO document_types (office_id, name, name_norm, status)
VALUES
  ('registrar', 'Transcript of Records', 'transcript of records', 'Active'),
  ('registrar', 'Diploma', 'diploma', 'Active'),
  ('registrar', 'Certificate of Good Moral', 'certificate of good moral', 'Active'),
  ('registrar', 'Form 137', 'form 137', 'Active'),
  ('registrar', 'Certificate of Enrollment', 'certificate of enrollment', 'Active'),
  ('registrar', 'Birth Certificate', 'birth certificate', 'Active')
ON CONFLICT (office_id, name_norm) DO NOTHING;
