-- A scan can create at most one document, even when promotion requests race.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS source_ingest_id BIGINT REFERENCES ingest_queue(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_source_ingest_id
  ON documents(source_ingest_id)
  WHERE source_ingest_id IS NOT NULL;
