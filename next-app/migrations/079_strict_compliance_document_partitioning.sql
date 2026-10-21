-- Migration 079: Strict Compliance Document Partitioning
-- Ensures document types for Registrar are strictly partitioned:
-- 1. Inward compliance requirements submitted by students (201 Folder)
-- 2. Outward credentials/certifications requested via ODRS (not submitted by student)

-- 1. Ensure all outward requestable credentials have is_compliance = FALSE and is_requestable = TRUE
UPDATE document_types
SET is_compliance = FALSE,
    is_requestable = TRUE
WHERE office_id = 'registrar'
  AND (
    name_norm IN (
      'transcript of records',
      'diploma',
      'certificate of graduation',
      'certificate of transfer credentials (honorable dismissal)',
      'certificate of enrollment',
      'certificate of registration',
      'certified true copy of records',
      'certification of grades (cross-enrollee)',
      'certificate of good moral',
      'good moral certificate',
      'test ingestion credential',
      'student disciplinary clearance',
      'organization registration certificate',
      'copy of grades'
    )
    OR is_requestable = TRUE
  )
  AND name_norm != 'clearance form';

-- 2. Ensure all inward student compliance requirements have is_compliance = TRUE and is_requestable = FALSE
UPDATE document_types
SET is_compliance = TRUE,
    is_requestable = FALSE
WHERE office_id = 'registrar'
  AND name_norm IN (
    'birth certificate',
    'psa birth certificate',
    'form 137',
    'form 137 / sf10',
    'sf10-shs',
    'grade 12 report card',
    'grade 11 report card',
    'ctc grade 11 report card',
    'ctc grade 10 report card',
    'health information sheet',
    'health and information sheet',
    'certificate of good moral character',
    'caepup application form',
    'sar form',
    'undertaking and waiver of right',
    'clearance form'
  );

-- 3. Archive rogue OSAS or test entries mistakenly created under registrar
UPDATE document_types
SET status = 'Archived',
    is_compliance = FALSE
WHERE office_id = 'registrar'
  AND name_norm IN (
    'event proposal',
    'activity request',
    'activity permit',
    'constitution & by-laws (cbl)',
    'financial liquidation report',
    'testing sample document',
    'new doc 1',
    'new doc 2',
    'new doc 3',
    'new doc 4',
    'new doc 5'
  );
