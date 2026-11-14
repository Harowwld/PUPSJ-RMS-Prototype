-- Additional archival types supplied for scanning. Compliance requirements.
INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
VALUES
  ('registrar', 'Confirmation Slip', 'confirmation slip', 'Active', TRUE, FALSE, 'Admission & Identity'),
  ('registrar', 'Route and Approval Slip', 'route and approval slip', 'Active', TRUE, FALSE, 'Admission & Identity'),
  ('registrar', 'Certification and Undertaking', 'certification and undertaking', 'Active', TRUE, FALSE, 'Admission & Identity'),
  ('registrar', 'SF10 JHS Permanent Record', 'sf10 jhs permanent record', 'Active', TRUE, FALSE, 'Academic Records'),
  ('registrar', 'Form 137 SHS Permanent Record', 'form 137 shs permanent record', 'Active', TRUE, FALSE, 'Academic Records'),
  ('registrar', 'SF9 Progress Report Card', 'sf9 progress report card', 'Active', TRUE, FALSE, 'Academic Records')
ON CONFLICT (office_id, name_norm) DO UPDATE SET is_compliance = TRUE, is_requestable = FALSE;
