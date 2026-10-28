-- Migration 081: Align Registrar and OSAS Taxonomy
-- 1. Registrar: 8 Official Degree Programs & Sections 1-1 to 4-2 (64 sections)
-- 2. Registrar: Strictly the 11 Inbound Compliance Document Types
-- 3. OSAS: Strictly Student Organization documents (CBL, Proposals, Liquidation, Post-Event); No Good Moral or Clearance.

-- 1. Degree Programs for Registrar
INSERT INTO courses (office_id, code, name, status)
VALUES
  ('registrar', 'BSA', 'Bachelor of Science in Accountancy', 'Active'),
  ('registrar', 'BSEDEN', 'Bachelor in Secondary Education major in English', 'Active'),
  ('registrar', 'BSENT', 'Bachelor of Science in Entrepreneurship', 'Active'),
  ('registrar', 'BSBA-FM', 'Bachelor of Science in Business Education major in Financial Management', 'Active'),
  ('registrar', 'BSIT', 'Bachelor of Science in Information Technology', 'Active'),
  ('registrar', 'BSHM', 'Bachelor of Science in Hospitality Management', 'Active'),
  ('registrar', 'BS Psy', 'Bachelor of Science in Psychology', 'Active'),
  ('registrar', 'DICT', 'Diploma in Information and Communications Technology', 'Active')
ON CONFLICT (office_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active';

-- Ensure OSAS has no courses or sections
DELETE FROM courses WHERE office_id = 'osas';
DELETE FROM sections WHERE office_id = 'osas';

-- 2. Sections for Registrar (8 programs x 8 sections = 64 sections)
INSERT INTO sections (office_id, name, course_code, status)
SELECT 'registrar', s.name, c.code, 'Active'
FROM (
  VALUES
    ('1-1'), ('1-2'),
    ('2-1'), ('2-2'),
    ('3-1'), ('3-2'),
    ('4-1'), ('4-2')
) AS s(name)
CROSS JOIN (
  VALUES
    ('BSA'), ('BSEDEN'), ('BSENT'), ('BSBA-FM'),
    ('BSIT'), ('BSHM'), ('BS Psy'), ('DICT')
) AS c(code)
ON CONFLICT (office_id, name, course_code) DO UPDATE SET status = 'Active';

-- 3. Registrar: Strictly the 11 Inbound Compliance Documents
INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES
  ('registrar', 'CAEPUP 2023 Application Form', 'caepup 2023 application form', 'Active', TRUE, FALSE, 'Admission & Identity'),
  ('registrar', 'SAR Form (circled)', 'sar form (circled)', 'Active', TRUE, FALSE, 'Admission & Identity'),
  ('registrar', 'Health and Information Sheet', 'health and information sheet', 'Active', TRUE, FALSE, 'Certificates & Clearances'),
  ('registrar', 'Undertaking and Waiver of Right', 'undertaking and waiver of right', 'Active', TRUE, FALSE, 'Admission & Identity'),
  ('registrar', 'CTC Grade 10 Report Card', 'ctc grade 10 report card', 'Active', TRUE, FALSE, 'Academic Records'),
  ('registrar', 'CTC Grade 11 Report Card', 'ctc grade 11 report card', 'Active', TRUE, FALSE, 'Academic Records'),
  ('registrar', 'Grade 12 Report Card (1st and 2nd Semester)', 'grade 12 report card (1st and 2nd semester)', 'Active', TRUE, FALSE, 'Academic Records'),
  ('registrar', 'SHS Diploma or Certificate of Graduation', 'shs diploma or certificate of graduation', 'Active', TRUE, FALSE, 'Academic Records'),
  ('registrar', 'Certificate of Good Moral Character', 'certificate of good moral character', 'Active', TRUE, FALSE, 'Certificates & Clearances'),
  ('registrar', 'PSA Birth Certificate (circled)', 'psa birth certificate (circled)', 'Active', TRUE, FALSE, 'Admission & Identity'),
  ('registrar', 'Photocopy of ID', 'photocopy of id', 'Active', TRUE, FALSE, 'Admission & Identity')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = TRUE,
  is_requestable = FALSE,
  compliance_category = EXCLUDED.compliance_category;

-- 3b. Registrar: Strictly Official Outward Requestable Credentials (ODRS)
INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES
  ('registrar', 'Transcript of Records', 'transcript of records', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Certified True Copy of Records', 'certified true copy of records', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Certification of Grades (Cross-Enrollee)', 'certification of grades (cross-enrollee)', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Diploma', 'diploma', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certificate of Graduation', 'certificate of graduation', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certificate of Transfer Credentials (Honorable Dismissal)', 'certificate of transfer credentials (honorable dismissal)', 'Active', FALSE, TRUE, 'Graduation & Exit Records'),
  ('registrar', 'Certificate of Enrollment', 'certificate of enrollment', 'Active', FALSE, TRUE, 'Certificates & Clearances'),
  ('registrar', 'Certificate of Registration', 'certificate of registration', 'Active', FALSE, TRUE, 'Certificates & Clearances')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = FALSE,
  is_requestable = TRUE,
  compliance_category = EXCLUDED.compliance_category;

-- Archive any non-compliance or legacy documents for Registrar
UPDATE document_types
SET status = 'Archived',
    is_compliance = FALSE,
    is_requestable = FALSE
WHERE office_id = 'registrar'
  AND name_norm NOT IN (
    'caepup 2023 application form',
    'sar form (circled)',
    'health and information sheet',
    'undertaking and waiver of right',
    'ctc grade 10 report card',
    'ctc grade 11 report card',
    'grade 12 report card (1st and 2nd semester)',
    'shs diploma or certificate of graduation',
    'certificate of good moral character',
    'psa birth certificate (circled)',
    'photocopy of id',
    'transcript of records',
    'certified true copy of records',
    'certification of grades (cross-enrollee)',
    'diploma',
    'certificate of graduation',
    'certificate of transfer credentials (honorable dismissal)',
    'certificate of enrollment',
    'certificate of registration'
  );

-- 4. OSAS: Strictly Student Organization Documents
INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES
  ('osas', 'Constitution & By-Laws (CBL)', 'constitution & by-laws (cbl)', 'Active', TRUE, FALSE, 'Student Governance & Activities'),
  ('osas', 'Event Proposal', 'event proposal', 'Active', TRUE, FALSE, 'Student Governance & Activities'),
  ('osas', 'Activity Request', 'activity request', 'Active', TRUE, FALSE, 'Student Governance & Activities'),
  ('osas', 'Activity Permit', 'activity permit', 'Active', TRUE, FALSE, 'Student Governance & Activities'),
  ('osas', 'Financial Liquidation Report', 'financial liquidation report', 'Active', TRUE, FALSE, 'Student Governance & Activities'),
  ('osas', 'Post-Event Narrative Report', 'post-event narrative report', 'Active', TRUE, FALSE, 'Student Governance & Activities'),
  ('osas', 'Post-Event Compliance Clearance Certificate', 'post-event compliance clearance certificate', 'Active', TRUE, FALSE, 'Student Governance & Activities'),
  ('osas', 'Organization Registration Certificate', 'organization registration certificate', 'Active', TRUE, FALSE, 'Student Governance & Activities')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = TRUE,
  is_requestable = FALSE,
  compliance_category = EXCLUDED.compliance_category;

-- Remove/archive individual student documents from OSAS (Good Moral, Clearance Form, Disciplinary Clearance)
UPDATE document_types
SET status = 'Archived',
    is_compliance = FALSE,
    is_requestable = FALSE
WHERE office_id = 'osas'
  AND name_norm IN (
    'good moral certificate',
    'certificate of good moral',
    'clearance form',
    'student disciplinary clearance'
  );
