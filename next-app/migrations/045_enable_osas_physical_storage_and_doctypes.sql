-- Migration 045: Enable OSAS Physical Storage Suite, Document Types, and Default Layout
-- Aligns OSAS with full physical and digital records management.

-- 1. Enable storage modules for OSAS in office_modules
INSERT INTO office_modules (office_id, module_id, enabled, updated_at)
VALUES 
  ('osas', 'storage_layout', TRUE, NOW()),
  ('osas', 'storage_explorer', TRUE, NOW()),
  ('osas', 'records_archive', TRUE, NOW())
ON CONFLICT (office_id, module_id) DO UPDATE SET
  enabled = TRUE,
  updated_at = NOW();

-- 2. Seed comprehensive document types for OSAS
INSERT INTO document_types (office_id, name, name_norm, status)
VALUES
  ('osas', 'Event Proposal', 'event proposal', 'Active'),
  ('osas', 'Constitution & By-Laws (CBL)', 'constitution & by-laws (cbl)', 'Active'),
  ('osas', 'Activity Request', 'activity request', 'Active'),
  ('osas', 'Financial Liquidation Report', 'financial liquidation report', 'Active'),
  ('osas', 'Student Disciplinary Clearance', 'student disciplinary clearance', 'Active'),
  ('osas', 'Organization Registration Certificate', 'organization registration certificate', 'Active'),
  ('osas', 'Good Moral Certificate', 'good moral certificate', 'Active'),
  ('osas', 'Clearance Form', 'clearance form', 'Active')
ON CONFLICT (office_id, name_norm) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'Active';

-- 3. Seed default storage layout for OSAS if not already set
INSERT INTO settings (key, value, updated_at)
VALUES (
  'storage_layout:osas',
  '{"version":2,"rooms":[{"id":1,"name":"Room 102 (OSAS Archive Office)","cabinets":[{"id":"A","rect":{"x":0.1,"y":0.15,"w":0.12,"h":0.15},"rotation":0,"drawerIds":[1,2,3,4]},{"id":"B","rect":{"x":0.28,"y":0.15,"w":0.12,"h":0.15},"rotation":0,"drawerIds":[1,2,3,4]},{"id":"C","rect":{"x":0.46,"y":0.15,"w":0.12,"h":0.15},"rotation":0,"drawerIds":[1,2,3,4]},{"id":"D","rect":{"x":0.64,"y":0.15,"w":0.12,"h":0.15},"rotation":0,"drawerIds":[1,2,3,4]}],"door":{"x":0.05,"y":0.96,"w":0.125,"h":0.04,"rotation":0}}]}',
  NOW()
)
ON CONFLICT (key) DO NOTHING;
