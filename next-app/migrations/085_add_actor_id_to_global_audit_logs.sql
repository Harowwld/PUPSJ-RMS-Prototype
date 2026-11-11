-- Migration 085: Add actor_id to global_audit_logs and backfill existing records
-- Allows immutable identity tracking and robust activity querying by account ID instead of mutable display names.

-- 1. Add actor_id column if it doesn't already exist
ALTER TABLE global_audit_logs ADD COLUMN IF NOT EXISTS actor_id TEXT;

-- 2. Create indexes for fast activity lookups and timeline sorting
CREATE INDEX IF NOT EXISTS idx_global_audit_logs_actor_id ON global_audit_logs(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_global_audit_logs_actor_id_created_at ON global_audit_logs(actor_id, created_at DESC) WHERE actor_id IS NOT NULL;

-- 3. Backfill student records (where actor is student_no)
UPDATE global_audit_logs
SET actor_id = actor
WHERE actor_id IS NULL
  AND role = 'Student'
  AND actor ~ '^\d{4}-\d{5}-[A-Za-z]{2}-\d+$';

-- 4. Backfill staff where actor directly matches staff.id
UPDATE global_audit_logs g
SET actor_id = s.id
FROM staff s
WHERE g.actor_id IS NULL
  AND LOWER(TRIM(g.actor)) = LOWER(TRIM(s.id));

-- 5. Backfill staff where actor matches email
UPDATE global_audit_logs g
SET actor_id = s.id
FROM staff s
WHERE g.actor_id IS NULL
  AND LOWER(TRIM(g.actor)) = LOWER(TRIM(s.email));

-- 6. Backfill default seed SuperAdmin records ('System Administrator')
UPDATE global_audit_logs
SET actor_id = 'PUPSUPERADMIN-001'
WHERE actor_id IS NULL
  AND (role = 'SuperAdmin' OR role = 'Admin')
  AND LOWER(TRIM(actor)) = 'system administrator';

-- 7. Backfill known personnel by display name snapshot
UPDATE global_audit_logs
SET actor_id = 'PUPREGISTRAR-003'
WHERE actor_id IS NULL
  AND LOWER(TRIM(actor)) = 'elias austria';

UPDATE global_audit_logs
SET actor_id = 'PUPREGISTRAR-002'
WHERE actor_id IS NULL
  AND LOWER(TRIM(actor)) = 'marcus reyes';

UPDATE global_audit_logs
SET actor_id = 'PUPOSAS-001'
WHERE actor_id IS NULL
  AND LOWER(TRIM(actor)) = 'sandra gomez';

UPDATE global_audit_logs
SET actor_id = 'PUPSUPERADMIN-001'
WHERE actor_id IS NULL
  AND role = 'SuperAdmin'
  AND LOWER(TRIM(actor)) = 'solt';

UPDATE global_audit_logs
SET actor_id = 'PUPREGISTRAR-004'
WHERE actor_id IS NULL
  AND (LOWER(TRIM(actor)) = 'mark' OR LOWER(TRIM(actor)) = 'mark tuchin');
