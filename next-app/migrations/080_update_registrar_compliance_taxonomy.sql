-- Migration 080: Update Registrar Compliance Taxonomy
-- Aligns Registrar document types with the real institutional inbound compliance requirements:
-- 1. CAEPUP 2023 Application Form (Admission & Identity)
-- 2. SAR Form (circled) (Admission & Identity)
-- 3. Health and Information Sheet (Certificates & Clearances)
-- 4. Undertaking and Waiver of Right (Admission & Identity)
-- 5. CTC Grade 10 Report Card (Academic Records)
-- 6. CTC Grade 11 Report Card (Academic Records)
-- 7. Grade 12 Report Card (1st and 2nd Semester) (Academic Records)
-- 8. SHS Diploma or Certificate of Graduation (Academic Records)
-- 9. Certificate of Good Moral Character (Certificates & Clearances)
-- 10. PSA Birth Certificate (circled) (Admission & Identity)
-- 11. Photocopy of ID (Admission & Identity)

-- 1. Upsert the 11 official Registrar inbound compliance document types
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

-- 2. Migrate any existing document records referencing old alias names to new taxonomy
UPDATE documents
SET doc_type = 'CAEPUP 2023 Application Form'
WHERE office_id = 'registrar' AND LOWER(doc_type) IN ('caepup application form', 'caepup application slip');

UPDATE documents
SET doc_type = 'SAR Form (circled)'
WHERE office_id = 'registrar' AND LOWER(doc_type) = 'sar form';

UPDATE documents
SET doc_type = 'Health and Information Sheet'
WHERE office_id = 'registrar' AND LOWER(doc_type) = 'health information sheet';

UPDATE documents
SET doc_type = 'PSA Birth Certificate (circled)'
WHERE office_id = 'registrar' AND LOWER(doc_type) IN ('psa birth certificate', 'birth certificate');

UPDATE documents
SET doc_type = 'Grade 12 Report Card (1st and 2nd Semester)'
WHERE office_id = 'registrar' AND LOWER(doc_type) = 'grade 12 report card';

-- 3. Archive legacy/superseded document types in Registrar so they no longer appear in active compliance checklists
UPDATE document_types
SET status = 'Archived',
    is_compliance = FALSE,
    is_requestable = FALSE
WHERE office_id = 'registrar'
  AND name_norm IN (
    'caepup application form',
    'sar form',
    'psa birth certificate',
    'birth certificate',
    'health information sheet',
    'grade 12 report card',
    'grade 11 report card',
    'form 137',
    'form 137 / sf10',
    'sf10-shs',
    'clearance form'
  );
