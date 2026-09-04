-- Restore the default OSAS accounts if an earlier seed was recorded without
-- creating the rows in the local PostgreSQL database.
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
ON CONFLICT (id) DO UPDATE SET
  office_id = EXCLUDED.office_id,
  fname = EXCLUDED.fname,
  lname = EXCLUDED.lname,
  role = EXCLUDED.role,
  section = EXCLUDED.section,
  status = 'Active',
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  password_last_changed = NOW(),
  updated_at = NOW();
