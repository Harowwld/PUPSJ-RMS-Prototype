-- Migration 052: Partition Document Types by Purpose (Compliance vs. Requestable Records)
-- Establishes explicit boundaries between inward student submission requirements (201 Folder)
-- and outward official credentials issuable through the Online Document Request System (ODRS).

-- 1. Add purpose and classification columns to document_types
ALTER TABLE document_types
  ADD COLUMN IF NOT EXISTS is_requestable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_compliance BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS compliance_category TEXT DEFAULT 'General Requirements';

-- 2. Update existing Registrar document types
UPDATE document_types
SET is_compliance = TRUE,
    is_requestable = FALSE,
    compliance_category = 'Admission & Identity'
WHERE office_id = 'registrar' AND name_norm IN ('birth certificate', 'psa birth certificate');

UPDATE document_types
SET is_compliance = TRUE,
    is_requestable = FALSE,
    compliance_category = 'Academic Records'
WHERE office_id = 'registrar' AND name_norm IN ('form 137', 'form 137 / sf10', 'sf10-shs');

UPDATE document_types
SET is_compliance = FALSE,
    is_requestable = TRUE,
    compliance_category = 'Graduation & Exit Records'
WHERE office_id = 'registrar' AND name_norm IN ('transcript of records', 'diploma');

UPDATE document_types
SET is_compliance = FALSE,
    is_requestable = TRUE,
    compliance_category = 'Certificates & Clearances'
WHERE office_id = 'registrar' AND name_norm IN ('certificate of good moral', 'certificate of enrollment');

-- 3. Seed / upsert essential Registrar document types
INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES
  ('registrar', 'Health Information Sheet', 'health information sheet', 'Active', TRUE, FALSE, 'Certificates & Clearances'),
  ('registrar', 'Grade 12 Report Card', 'grade 12 report card', 'Active', TRUE, FALSE, 'Academic Records'),
  ('registrar', 'Copy of Grades', 'copy of grades', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Certificate of Registration', 'certificate of registration', 'Active', FALSE, TRUE, 'Certificates & Clearances')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = EXCLUDED.is_compliance,
  is_requestable = EXCLUDED.is_requestable,
  compliance_category = EXCLUDED.compliance_category;

-- 4. Update / upsert OSAS document types
UPDATE document_types
SET is_compliance = FALSE,
    is_requestable = TRUE,
    compliance_category = 'Certificates & Clearances'
WHERE office_id = 'osas' AND name_norm IN (
  'good moral certificate',
  'student disciplinary clearance',
  'organization registration certificate'
);

UPDATE document_types
SET is_compliance = TRUE,
    is_requestable = TRUE,
    compliance_category = 'Certificates & Clearances'
WHERE office_id = 'osas' AND name_norm = 'clearance form';

UPDATE document_types
SET is_compliance = TRUE,
    is_requestable = FALSE,
    compliance_category = 'Student Governance & Activities'
WHERE office_id = 'osas' AND name_norm IN (
  'event proposal',
  'constitution & by-laws (cbl)',
  'activity request',
  'financial liquidation report'
);
