-- Relax staff-only foreign key on transaction_updates.created_by
-- so student_no can also be recorded for student submissions.
ALTER TABLE transaction_updates
  DROP CONSTRAINT IF EXISTS transaction_updates_created_by_fkey;
