CREATE TABLE IF NOT EXISTS event_proposal_versions (
  id BIGSERIAL PRIMARY KEY,
  event_proposal_id BIGINT NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  title TEXT NOT NULL,
  event_date DATE,
  original_filename TEXT NOT NULL,
  storage_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type = 'application/pdf'),
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 26214400),
  submitted_by_email TEXT,
  submitted_by_student_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_proposal_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_event_proposal_versions_proposal
  ON event_proposal_versions(event_proposal_id, revision_number);

INSERT INTO event_proposal_versions (
  event_proposal_id, revision_number, title, event_date, original_filename,
  storage_filename, mime_type, size_bytes, submitted_by_email,
  submitted_by_student_no, created_at
)
SELECT id, 1, title, event_date, original_filename, storage_filename, mime_type,
       size_bytes, submitted_by_email, student_no, created_at
  FROM event_proposals
ON CONFLICT (event_proposal_id, revision_number) DO NOTHING;
