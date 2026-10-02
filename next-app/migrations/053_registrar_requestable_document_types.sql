-- Align the Registrar request dropdown with credentials handled by the PUP Registrar.
-- Compliance document types remain available for staff intake, but not student requests.
UPDATE document_types
SET is_requestable = FALSE
WHERE office_id = 'registrar';

INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES
  ('registrar', 'Transcript of Records', 'transcript of records', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Certified True Copy of Records', 'certified true copy of records', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Diploma', 'diploma', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certificate of Transfer Credentials (Honorable Dismissal)', 'certificate of transfer credentials (honorable dismissal)', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certificate of Enrollment', 'certificate of enrollment', 'Active', FALSE, TRUE, 'Certificates & Clearances'),
  ('registrar', 'Certificate of Graduation', 'certificate of graduation', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certification of Grades (Cross-Enrollee)', 'certification of grades (cross-enrollee)', 'Active', FALSE, TRUE, 'Academic Records')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = FALSE,
  is_requestable = TRUE,
  compliance_category = EXCLUDED.compliance_category;
