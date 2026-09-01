ALTER TABLE event_proposals
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_event_proposals_active
  ON event_proposals(office_id, created_at DESC)
  WHERE archived_at IS NULL;
