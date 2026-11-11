ALTER TABLE event_proposal_versions
  ADD COLUMN IF NOT EXISTS file_pruned_at TIMESTAMPTZ;
