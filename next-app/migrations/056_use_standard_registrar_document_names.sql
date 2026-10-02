-- Use standard document names in the request dropdown; copy count belongs in request details.
UPDATE document_types
SET is_requestable = FALSE
WHERE office_id = 'registrar'
  AND name_norm IN (
    'transcript of records (first copy)',
    'transcript of records (second copy)',
    'diploma (first copy)',
    'diploma (second copy)'
  );

INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES
  ('registrar', 'Transcript of Records', 'transcript of records', 'Active', FALSE, TRUE, 'Academic Records'),
  ('registrar', 'Diploma', 'diploma', 'Active', FALSE, TRUE, 'Graduation & Exit Records')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = FALSE,
  is_requestable = TRUE,
  compliance_category = EXCLUDED.compliance_category;
