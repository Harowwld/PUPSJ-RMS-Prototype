INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES ('registrar', 'Grade 11 Report Card', 'grade 11 report card', 'Active', TRUE, FALSE, 'Academic Records')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active',
  is_compliance = EXCLUDED.is_compliance,
  is_requestable = EXCLUDED.is_requestable,
  compliance_category = EXCLUDED.compliance_category;
