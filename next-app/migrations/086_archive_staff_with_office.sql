ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS archived_by_office BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE staff
   SET status = 'Archived', archived_by_office = TRUE, updated_at = NOW()
 WHERE status = 'Active'
   AND office_id IN (SELECT id FROM offices WHERE status <> 'Active');
