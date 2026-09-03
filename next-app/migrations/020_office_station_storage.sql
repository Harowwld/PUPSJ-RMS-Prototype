-- Migration 020: Add workstation hardware binding and storage partition paths to offices
ALTER TABLE offices ADD COLUMN IF NOT EXISTS station_name TEXT;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS ingest_token TEXT;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS scanner_model TEXT;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS last_station_ping TIMESTAMPTZ;

-- Backfill default station hardware configurations for existing institutional departments
UPDATE offices
SET 
  station_name = COALESCE(station_name, 'REG-ARCHIVE-PC01'),
  storage_path = COALESCE(storage_path, '.local/storage/registrar/uploads'),
  ingest_token = COALESCE(ingest_token, 'station_token_registrar_sec_01'),
  scanner_model = COALESCE(scanner_model, 'Fujitsu fi-7160 Batch Duplex'),
  last_station_ping = NOW()
WHERE id = 'registrar';

UPDATE offices
SET 
  station_name = COALESCE(station_name, 'OSAS-OPERATIONS-PC01'),
  storage_path = COALESCE(storage_path, '.local/storage/osas/uploads'),
  ingest_token = COALESCE(ingest_token, 'station_token_osas_sec_02'),
  scanner_model = COALESCE(scanner_model, 'Canon imageFORMULA Flatbed/ADF'),
  last_station_ping = NOW()
WHERE id = 'osas';
