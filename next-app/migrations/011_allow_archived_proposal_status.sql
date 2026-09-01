-- Archived is a visible workflow status, not only a storage flag.
ALTER TABLE event_proposals
  DROP CONSTRAINT IF EXISTS event_proposals_status_check;

ALTER TABLE event_proposals
  ADD CONSTRAINT event_proposals_status_check
  CHECK (status IN ('Submitted', 'Under Review', 'Needs Revision', 'Approved', 'Declined', 'Archived'));
