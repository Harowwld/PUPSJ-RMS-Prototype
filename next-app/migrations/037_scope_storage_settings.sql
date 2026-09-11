-- Move legacy global archive-layout settings into the registrar partition.
-- The old keys represented the registrar archive before office isolation.
INSERT INTO settings (key, value, updated_at)
SELECT 'storage_layout:registrar', value, updated_at
FROM settings
WHERE key = 'storage_layout'
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, updated_at)
SELECT 'storage_templates:registrar', value, updated_at
FROM settings
WHERE key = 'storage_templates'
ON CONFLICT (key) DO NOTHING;

DELETE FROM settings WHERE key IN ('storage_layout', 'storage_templates');
