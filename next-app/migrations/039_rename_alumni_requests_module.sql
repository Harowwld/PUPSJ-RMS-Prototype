-- Migration 039: Rename 'alumni_requests' module to 'document_requests'
-- Updates the module ID and display name across modules and office_modules tables.

-- Step 1: Insert the new module ID with updated name/description
INSERT INTO modules (id, name, description, category, icon, sidebar_group, sort_order, is_system, component_key)
SELECT
  'document_requests',
  'Document Requests',
  'Online and staff-mediated document request management (ODRS)',
  category, icon, sidebar_group, sort_order, is_system, component_key
FROM modules
WHERE id = 'alumni_requests'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Step 2: Migrate office_modules references
UPDATE office_modules
SET module_id = 'document_requests'
WHERE module_id = 'alumni_requests'
  AND NOT EXISTS (
    SELECT 1 FROM office_modules om2
    WHERE om2.office_id = office_modules.office_id
      AND om2.module_id = 'document_requests'
  );

-- Step 3: Remove the old module (only if no office_modules still reference it)
DELETE FROM modules
WHERE id = 'alumni_requests'
  AND NOT EXISTS (
    SELECT 1 FROM office_modules WHERE module_id = 'alumni_requests'
  );
