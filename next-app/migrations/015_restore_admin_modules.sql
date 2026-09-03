-- Restore the Admin module registry and expose the modules to office admins.
-- The sidebar intentionally hides modules that are not enabled for the office.
INSERT INTO modules (
  id, name, description, category, icon, sidebar_group, sort_order, is_system, component_key
)
VALUES
  ('records_review', 'Records Review', 'Approve or decline uploaded documents', 'admin', 'ph-bold ph-seal-check', 'Operations & Analytics', 1, FALSE, 'DigitalRecordsReviewTab'),
  ('compliance_analytics', 'Compliance', 'Digitization compliance metrics dashboard', 'admin', 'ph-bold ph-chart-bar', 'Operations & Analytics', 2, FALSE, 'DigitizationComplianceTab'),
  ('request_analytics', 'Request Analytics', 'SLA analytics for document requests', 'admin', 'ph-bold ph-trend-up', 'Operations & Analytics', 3, FALSE, 'SLAAnalyticsTab'),
  ('storage_layout', 'Storage Layout', 'Physical room/cabinet/drawer storage editor', 'admin', 'ph-bold ph-warehouse', 'System Configuration', 5, FALSE, 'StorageLayoutEditorTab'),
  ('system_config', 'System Config', 'Configure courses, sections, document types, and recognition templates', 'admin', 'ph-bold ph-gear', 'System Configuration', 6, FALSE, 'SystemConfigTab'),
  ('backup', 'Backup & Restore', 'Database backup and restore operations', 'admin', 'ph-bold ph-database-backup', 'System Configuration', 7, FALSE, 'BackupTab')
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
  ('registrar', 'records_review', TRUE, 1),
  ('registrar', 'compliance_analytics', TRUE, 2),
  ('registrar', 'request_analytics', TRUE, 3),
  ('registrar', 'storage_layout', TRUE, 5),
  ('registrar', 'system_config', TRUE, 6),
  ('registrar', 'backup', TRUE, 7),
  ('osas', 'records_review', TRUE, 1),
  ('osas', 'compliance_analytics', TRUE, 2),
  ('osas', 'system_config', TRUE, 6),
  ('osas', 'backup', TRUE, 7)
ON CONFLICT (office_id, module_id) DO UPDATE SET
  enabled = TRUE,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
