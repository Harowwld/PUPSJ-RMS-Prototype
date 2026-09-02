-- Default Registrar Admin account for local development/testing.
-- Password is SHA-256("pupstaff"), the default DEFAULT_STAFF_PASSWORD value.
INSERT INTO staff (
  id, office_id, fname, lname, role, section, status, email,
  password_hash, created_at, updated_at
)
VALUES (
  'PUPREGISTRAR-003', 'registrar', 'Elias', 'Austria', 'Admin', 'Administrative', 'Active',
  'admin.registrar@pup.local',
  'a9417c5cd7aa86368693cba6d7706962f73fd0369f34cca063f01ec881d3c175', NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  office_id = EXCLUDED.office_id,
  fname = EXCLUDED.fname,
  lname = EXCLUDED.lname,
  role = EXCLUDED.role,
  section = EXCLUDED.section,
  status = 'Active',
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
