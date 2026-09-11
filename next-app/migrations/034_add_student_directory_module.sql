-- Migration 034: Register student_directory module for Staff workspace

INSERT INTO modules (id, name, description, category, icon, sidebar_group, sort_order, is_system, component_key)
VALUES (
  'student_directory',
  'Student Directory',
  'Manage student master records, academic profiles, and physical archive assignments',
  'staff',
  'ph-bold ph-users',
  'Operations',
  3,
  FALSE,
  'StudentDirectoryTab'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  sidebar_group = EXCLUDED.sidebar_group,
  sort_order = EXCLUDED.sort_order,
  is_system = EXCLUDED.is_system,
  component_key = EXCLUDED.component_key;

-- Provision for registrar and osas
INSERT INTO office_modules (office_id, module_id, enabled)
VALUES
  ('registrar', 'student_directory', TRUE),
  ('osas', 'student_directory', TRUE)
ON CONFLICT (office_id, module_id) DO UPDATE SET enabled = TRUE;
