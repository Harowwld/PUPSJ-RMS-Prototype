-- Dynamic physical scanner input folder per office.
ALTER TABLE offices ADD COLUMN IF NOT EXISTS inbound_path TEXT;

UPDATE offices
SET inbound_path = COALESCE(inbound_path, '.local/hot-folder/INBOUND')
WHERE id = 'registrar';

UPDATE offices
SET inbound_path = COALESCE(inbound_path, '.local/hot-folder/INBOUND')
WHERE inbound_path IS NULL;
