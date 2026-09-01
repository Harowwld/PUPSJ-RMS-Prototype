-- Keep previously archived proposals consistent with the visible status.
UPDATE event_proposals
SET status = 'Archived', updated_at = NOW()
WHERE archived_at IS NOT NULL AND status <> 'Archived';
