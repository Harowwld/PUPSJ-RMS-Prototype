-- Keep legacy display names intact; full middle names cannot be reconstructed safely.
ALTER TABLE students ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_name TEXT;
