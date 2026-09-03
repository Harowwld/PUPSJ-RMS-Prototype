-- Seed default SuperAdmin account for local development and system administration.
-- Password is SHA-256("pupstaff"), matching DEFAULT_STAFF_PASSWORD default.
INSERT INTO staff (
  id, office_id, fname, lname, role, section, status, email,
  password_hash, password_last_changed, updated_at
)
VALUES (
  'PUPREGISTRAR-001', NULL, 'Elias', 'Austria', 'SuperAdmin', 'Administrative', 'Active',
  'admin.default@pup.local',
  'a9417c5cd7aa86368693cba6d7706962f73fd0369f34cca063f01ec881d3c175', NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  office_id = NULL,
  fname = EXCLUDED.fname,
  lname = EXCLUDED.lname,
  role = 'SuperAdmin',
  section = EXCLUDED.section,
  status = 'Active',
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
