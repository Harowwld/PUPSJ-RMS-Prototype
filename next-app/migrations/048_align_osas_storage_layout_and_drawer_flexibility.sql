-- Migration 047: Standardize OSAS storage layout and allow flexible drawer naming/years

-- 1. Alter students.storage_drawer to TEXT to support any year (e.g. 2015) or custom label
ALTER TABLE students ALTER COLUMN storage_drawer TYPE TEXT USING storage_drawer::TEXT;

-- 2. Standardize storage_layout:osas in settings to match Registrar layout dimensions (0.075 x 0.12) and Room 1 naming
UPDATE settings
SET value = json_build_object(
  'version', 2,
  'rooms', json_build_array(
    json_build_object(
      'id', 1,
      'name', 'Room 1',
      'cabinets', json_build_array(
        json_build_object('id', '2020', 'rect', json_build_object('x', 0.3125, 'y', 0.22, 'w', 0.075, 'h', 0.12), 'rotation', 0, 'drawerIds', json_build_array(1, 2, 3, 4)),
        json_build_object('id', '2021', 'rect', json_build_object('x', 0.4125, 'y', 0.22, 'w', 0.075, 'h', 0.12), 'rotation', 0, 'drawerIds', json_build_array(1, 2, 3, 4)),
        json_build_object('id', '2022', 'rect', json_build_object('x', 0.5125, 'y', 0.22, 'w', 0.075, 'h', 0.12), 'rotation', 0, 'drawerIds', json_build_array(1, 2, 3, 4)),
        json_build_object('id', '2023', 'rect', json_build_object('x', 0.6125, 'y', 0.22, 'w', 0.075, 'h', 0.12), 'rotation', 0, 'drawerIds', json_build_array(1, 2, 3, 4)),
        json_build_object('id', '2024', 'rect', json_build_object('x', 0.3125, 'y', 0.38, 'w', 0.075, 'h', 0.12), 'rotation', 0, 'drawerIds', json_build_array(1, 2, 3, 4)),
        json_build_object('id', '2025', 'rect', json_build_object('x', 0.4125, 'y', 0.38, 'w', 0.075, 'h', 0.12), 'rotation', 0, 'drawerIds', json_build_array(1, 2, 3, 4)),
        json_build_object('id', '2026', 'rect', json_build_object('x', 0.5125, 'y', 0.38, 'w', 0.075, 'h', 0.12), 'rotation', 0, 'drawerIds', json_build_array(1, 2, 3, 4)),
        json_build_object('id', '2027', 'rect', json_build_object('x', 0.6125, 'y', 0.38, 'w', 0.075, 'h', 0.12), 'rotation', 0, 'drawerIds', json_build_array(1, 2, 3, 4))
      ),
      'door', json_build_object('x', 0.05, 'y', 0.96, 'w', 0.125, 'h', 0.04, 'rotation', 0)
    )
  )
)::text,
updated_at = CURRENT_TIMESTAMP
WHERE key = 'storage_layout:osas';
