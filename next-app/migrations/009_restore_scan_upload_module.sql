-- Restore the Scan & Upload module and expose it to office staff.
INSERT INTO modules (
  id, name, description, category, icon, sidebar_group, sort_order, is_system, component_key
)
VALUES (
  'scan_upload',
  'Scan & Upload',
  'Scan and upload documents with OCR',
  'staff',
  'ph-bold ph-scan',
  'Operations',
  2,
  FALSE,
  'ScanUploadTab'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  sidebar_group = EXCLUDED.sidebar_group,
  sort_order = EXCLUDED.sort_order,
  component_key = EXCLUDED.component_key;

INSERT INTO office_modules (office_id, module_id, enabled, sort_order)
VALUES
  ('registrar', 'scan_upload', TRUE, 2),
  ('osas', 'scan_upload', TRUE, 2)
ON CONFLICT (office_id, module_id) DO UPDATE SET
  enabled = TRUE,
  updated_at = NOW();
