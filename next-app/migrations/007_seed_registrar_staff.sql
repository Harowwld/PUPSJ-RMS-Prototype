-- Default Registrar staff account for local development/testing.
-- Password is the SHA-256 hash of DEFAULT_STAFF_PASSWORD's default value: pupstaff.
INSERT INTO staff (
  id, office_id, fname, lname, role, section, status, email,
  password_hash, created_at, updated_at
)
VALUES (
  'PUPREGISTRAR-002', 'registrar', 'Registrar', 'Staff', 'Staff', 'Records', 'Active',
  'staff.registrar@pup.local',
  'a9417c5cd7aa86368693cba6d7706962f73fd0369f34cca063f01ec881d3c175', NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  office_id = EXCLUDED.office_id,
  status = 'Active',
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
