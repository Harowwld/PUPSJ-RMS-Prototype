-- Migration 026: Update SuperAdmin credentials and clean up legacy registrar accounts
-- Official SuperAdmin account: PUPSUPERADMIN-001 / superadmin@pup.local

-- 1. Insert or update the official SuperAdmin account
INSERT INTO staff (
  id, office_id, fname, lname, role, section, status, email,
  password_hash, password_last_changed, updated_at
)
VALUES (
  'PUPSUPERADMIN-001', NULL, 'System', 'Administrator', 'SuperAdmin', 'System Administration', 'Active',
  'superadmin@pup.local',
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
  password_last_changed = NOW(),
  updated_at = NOW();

-- 2. Pre-seed default recovery answers for PUPSUPERADMIN-001 so it bypasses first-time modal
INSERT INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
VALUES 
  ('PUPSUPERADMIN-001', 1, '6423a233682976d8b02da7381ffac82885915d18d45ba33db8ca4ae77218693a', NOW()),
  ('PUPSUPERADMIN-001', 2, '2fe42e742ff1500cf029fa211db48d7990be9081e7d4ee7f7dca14f52f354ab9', NOW()),
  ('PUPSUPERADMIN-001', 3, '48d6215903dff56238e52e8891380c8f8a4f2ee80f70f9ab40609ee691692e2d', NOW())
ON CONFLICT (staff_id, question_id) DO UPDATE SET
  answer_hash = EXCLUDED.answer_hash,
  updated_at = NOW();

-- 3. Reassign any legacy document_requests created by PUPREGISTRAR-001 to PUPREGISTRAR-002 (Registrar Staff)
UPDATE document_requests SET created_by = 'PUPREGISTRAR-002' WHERE created_by = 'PUPREGISTRAR-001';
UPDATE document_requests SET updated_by = 'PUPREGISTRAR-002' WHERE updated_by = 'PUPREGISTRAR-001';

-- 4. Clean up legacy PUPREGISTRAR-001 / admin.default@pup.local to avoid confusion
DELETE FROM staff_security_answers WHERE staff_id = 'PUPREGISTRAR-001';
DELETE FROM staff WHERE id = 'PUPREGISTRAR-001' OR email = 'admin.default@pup.local';
