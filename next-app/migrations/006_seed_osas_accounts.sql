-- Default OSAS staff accounts for local development/bootstrap.
-- The value below is SHA-256("pupstaff"), matching staffRepo.js login verification.
INSERT INTO staff (
  id, office_id, fname, lname, role, section, status, email,
  password_hash, password_last_changed, updated_at
)
VALUES
  ('PUPOSAS-001', 'osas', 'Sandra', 'Gomez', 'Admin', 'OSAS Admin', 'Active',
   'admin.osas@pup.local',
   'a9417c5cd7aa86368693cba6d7706962f73fd0369f34cca063f01ec881d3c175', NOW(), NOW()),
  ('PUPOSAS-002', 'osas', 'Juanito', 'Rizal', 'Staff', 'Student Affairs', 'Active',
   'staff.osas@pup.local',
   'a9417c5cd7aa86368693cba6d7706962f73fd0369f34cca063f01ec881d3c175', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
