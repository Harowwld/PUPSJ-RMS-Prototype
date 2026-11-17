-- Migration 105: Update Registrar ODRS Requestable Document Types (15 official credentials)

-- 1. Ensure the compliance Good Moral Certification uses the distinct compliance name
INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES ('registrar', 'Graduation and Good Moral Certification', 'graduation and good moral certification', 'Active', TRUE, FALSE, 'Certificates & Clearances')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = TRUE,
  is_requestable = FALSE,
  compliance_category = EXCLUDED.compliance_category;

-- 2. Upsert the 15 official Registrar ODRS requestable document types
INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES
  ('registrar', 'Transcript of Records (TOR) – 1st Copy', 'transcript of records (tor) – 1st copy', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Transcript of Records (TOR) – 2nd / Subsequent Copy', 'transcript of records (tor) – 2nd / subsequent copy', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Diploma (1st Copy)', 'diploma (1st copy)', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Diploma (Replacement or Certified True Copy)', 'diploma (replacement or certified true copy)', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certificate of Graduation', 'certificate of graduation', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Informative Copy of Grades (ICG)', 'informative copy of grades (icg)', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Certificate of Grades', 'certificate of grades', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Certificate of Enrollment', 'certificate of enrollment', 'Active', FALSE, TRUE, 'Certificates & Clearances'),
  ('registrar', 'Certificate of Candidacy', 'certificate of candidacy', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certificate of English as Medium of Instruction', 'certificate of english as medium of instruction', 'Active', FALSE, TRUE, 'Certificates & Clearances'),
  ('registrar', 'Honorable Dismissal (Transfer Credential)', 'honorable dismissal (transfer credential)', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'General Clearance', 'general clearance', 'Active', FALSE, TRUE, 'Certificates & Clearances'),
  ('registrar', 'Certification, Authentication, and Verification (CAV)', 'certification, authentication, and verification (cav)', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certificate of Good Moral Character', 'certificate of good moral character', 'Active', FALSE, TRUE, 'Certificates & Clearances'),
  ('registrar', 'Certified True Copy (CTC)', 'certified true copy (ctc)', 'Active', FALSE, TRUE, 'Academic Records')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = FALSE,
  is_requestable = TRUE,
  compliance_category = EXCLUDED.compliance_category;

-- 3. Migrate existing document_requests referencing superseded requestable document type names
UPDATE document_requests
SET doc_type = 'Transcript of Records (TOR) – 1st Copy'
WHERE office_id = 'registrar' AND LOWER(doc_type) IN ('transcript of records', 'transcript of records (first copy)');

UPDATE document_requests
SET doc_type = 'Transcript of Records (TOR) – 2nd / Subsequent Copy'
WHERE office_id = 'registrar' AND LOWER(doc_type) = 'transcript of records (second copy)';

UPDATE document_requests
SET doc_type = 'Diploma (1st Copy)'
WHERE office_id = 'registrar' AND LOWER(doc_type) = 'diploma';

UPDATE document_requests
SET doc_type = 'Diploma (Replacement or Certified True Copy)'
WHERE office_id = 'registrar' AND LOWER(doc_type) IN ('diploma (second copy)', 'second copy of diploma');

UPDATE document_requests
SET doc_type = 'Certificate of Grades'
WHERE office_id = 'registrar' AND LOWER(doc_type) IN ('certification of grades (cross-enrollee)', 'copy of grades');

UPDATE document_requests
SET doc_type = 'Certificate of Enrollment'
WHERE office_id = 'registrar' AND LOWER(doc_type) = 'certificate of registration';

UPDATE document_requests
SET doc_type = 'Honorable Dismissal (Transfer Credential)'
WHERE office_id = 'registrar' AND LOWER(doc_type) IN ('certificate of transfer credentials (honorable dismissal)', 'honorable dismissal');

UPDATE document_requests
SET doc_type = 'Certificate of Good Moral Character'
WHERE office_id = 'registrar' AND LOWER(doc_type) IN ('certificate of good moral', 'good moral character');

UPDATE document_requests
SET doc_type = 'Certified True Copy (CTC)'
WHERE office_id = 'registrar' AND LOWER(doc_type) IN ('certified true copy of records', 'certified true copy');

-- 4. Archive superseded requestable document types in Registrar
UPDATE document_types
SET status = 'Archived',
    is_compliance = FALSE,
    is_requestable = FALSE
WHERE office_id = 'registrar'
  AND name_norm IN (
    'transcript of records',
    'transcript of records (first copy)',
    'transcript of records (second copy)',
    'diploma',
    'diploma (second copy)',
    'certified true copy of records',
    'certification of grades (cross-enrollee)',
    'copy of grades',
    'certificate of transfer credentials (honorable dismissal)',
    'certificate of registration',
    'certificate of good moral'
  );
