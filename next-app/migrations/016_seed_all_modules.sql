-- Migration 016: Seed all missing standard modules for Admin and Staff workspaces

INSERT INTO modules (id, name, description, category, icon, sidebar_group, sort_order, is_system, component_key)
VALUES
  -- Admin Operations & Analytics
  ('records_review', 'Records Review', 'Approve or decline scanned student documents', 'admin', 'ph-bold ph-seal-check', 'Operations & Analytics', 1, FALSE, 'DigitalRecordsReviewTab'),
  ('compliance_analytics', 'Compliance', 'Digitization compliance analytics and metrics', 'admin', 'ph-bold ph-chart-bar', 'Operations & Analytics', 2, FALSE, 'DigitizationComplianceTab'),
  ('request_analytics', 'Requests', 'Document requests SLA analytics and performance metrics', 'admin', 'ph-bold ph-trend-up', 'Operations & Analytics', 3, FALSE, 'SLAAnalyticsTab'),

  -- Admin User Management
  ('staff_directory', 'Staff Directory', 'Manage office staff accounts', 'admin', 'ph-bold ph-users', 'User Management', 4, FALSE, 'StaffDirectoryTab'),

  -- Admin System Configuration
  ('storage_layout', 'Storage', '2D interactive room, cabinet, and drawer layout editor', 'admin', 'ph-bold ph-warehouse', 'System Configuration', 5, FALSE, 'StorageLayoutEditorTab'),
  ('system_config', 'Data', 'Manage courses, sections, and document types', 'admin', 'ph-bold ph-gear', 'System Configuration', 6, FALSE, 'SystemConfigTab'),
  ('backup', 'Backup', 'Database backups, export, and disaster recovery', 'admin', 'ph-bold ph-database-backup', 'System Configuration', 7, FALSE, 'BackupMaintenanceTab'),
  ('audit_logs', 'Audit Log', 'Activity audit trail and access logs', 'admin', 'ph-bold ph-shield-check', 'System Configuration', 8, TRUE, 'AuditLogsTab'),

  -- Staff Operations
  ('alumni_requests', 'Alumni Requests', 'Manage student and alumni document requests', 'staff', 'ph-bold ph-tray-arrow-up', 'Operations', 1, FALSE, 'DocumentRequestsTab'),
  ('osas_monitoring', 'OSAS Monitoring', 'Review student event proposals and requirements', 'staff', 'ph-bold ph-student', 'Operations', 2, FALSE, 'OsasMonitoringTab'),
  ('scan_upload', 'Scan & Upload', 'Scan and upload documents with OCR', 'staff', 'ph-bold ph-scan', 'Operations', 3, FALSE, 'ScanUploadTab'),
  ('documents', 'Documents', 'Manage student documents and records matrix', 'staff', 'ph-bold ph-file-text', 'Operations', 4, FALSE, 'DocumentsTab'),
  ('notifications', 'Notifications', 'Staff notification center', 'staff', 'ph-bold ph-bell', 'Operations', 5, TRUE, 'NotificationsTab'),

  -- Staff Records Archive
  ('records_archive', 'Records & Archive', 'Search student records and physical archive database', 'staff', 'ph-bold ph-archive-box', 'Records Archive', 6, FALSE, 'RecordsArchiveTab'),
  ('storage_explorer', 'Storage Explorer', '2D interactive physical archive storage visualization', 'staff', 'ph-bold ph-folder-open', 'Records Archive', 7, FALSE, 'StorageExplorerTab')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  sidebar_group = EXCLUDED.sidebar_group,
  sort_order = EXCLUDED.sort_order,
  is_system = EXCLUDED.is_system,
  component_key = EXCLUDED.component_key;

-- Provision modules for Registrar (all enabled except osas_monitoring)
INSERT INTO office_modules (office_id, module_id, enabled)
SELECT 'registrar', m.id, (m.id <> 'osas_monitoring')
FROM modules m
ON CONFLICT (office_id, module_id) DO UPDATE SET
  enabled = CASE WHEN office_modules.office_id = 'registrar' AND EXCLUDED.module_id = 'osas_monitoring' THEN FALSE ELSE TRUE END;

-- Provision modules for OSAS (all enabled except alumni_requests)
INSERT INTO office_modules (office_id, module_id, enabled)
SELECT 'osas', m.id, (m.id <> 'alumni_requests')
FROM modules m
ON CONFLICT (office_id, module_id) DO UPDATE SET
  enabled = CASE WHEN office_modules.office_id = 'osas' AND EXCLUDED.module_id = 'alumni_requests' THEN FALSE ELSE TRUE END;
