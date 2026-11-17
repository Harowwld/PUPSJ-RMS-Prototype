ALTER TABLE document_requests
  ADD COLUMN IF NOT EXISTS correction_items jsonb NOT NULL DEFAULT '[]'::jsonb;
