CREATE TABLE student_identity_link_reviews (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student_account', 'document_request', 'event_proposal', 'request_feedback')),
  entity_id BIGINT NOT NULL,
  student_no TEXT,
  student_account_id BIGINT,
  registry_profile_id BIGINT,
  account_profile_id BIGINT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (entity_type, entity_id)
);

-- The old schema allowed several accounts to point at one student number.
-- Keep those accounts intact, but expose secondary links for manual review.
INSERT INTO student_identity_link_reviews (
  entity_type, entity_id, student_no, student_account_id,
  registry_profile_id, account_profile_id
)
SELECT 'student_account', ranked.id, ranked.student_no, ranked.id,
       ranked.registry_profile_id, ranked.identity_profile_id
FROM (
  SELECT sa.id, sa.student_no, sa.identity_profile_id,
         s.identity_profile_id AS registry_profile_id,
         row_number() OVER (PARTITION BY sa.student_no ORDER BY sa.id) AS account_rank
  FROM student_accounts sa
  JOIN students s ON s.student_no = sa.student_no
) ranked
WHERE ranked.account_rank > 1
ON CONFLICT (entity_type, entity_id) DO NOTHING;

ALTER TABLE document_requests ADD COLUMN identity_profile_id BIGINT;
ALTER TABLE event_proposals ADD COLUMN identity_profile_id BIGINT;
ALTER TABLE document_request_feedback ADD COLUMN identity_profile_id BIGINT;

-- Record disagreeing historical links before selecting the account link as the
-- canonical owner. The original identifiers remain available for review.
INSERT INTO student_identity_link_reviews (
  entity_type, entity_id, student_no, student_account_id,
  registry_profile_id, account_profile_id
)
SELECT 'document_request', dr.id, dr.student_no, dr.student_account_id,
       s.identity_profile_id, sa.identity_profile_id
FROM document_requests dr
LEFT JOIN students s ON s.student_no = dr.student_no
LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
WHERE dr.student_no IS NOT NULL
  AND dr.student_account_id IS NOT NULL
  AND s.identity_profile_id IS DISTINCT FROM sa.identity_profile_id
ON CONFLICT (entity_type, entity_id) DO NOTHING;

INSERT INTO student_identity_link_reviews (
  entity_type, entity_id, student_no, student_account_id,
  registry_profile_id, account_profile_id
)
SELECT 'event_proposal', ep.id, ep.student_no, ep.student_account_id,
       s.identity_profile_id, sa.identity_profile_id
FROM event_proposals ep
LEFT JOIN students s ON s.student_no = ep.student_no
LEFT JOIN student_accounts sa ON sa.id = ep.student_account_id
WHERE ep.student_no IS NOT NULL
  AND ep.student_account_id IS NOT NULL
  AND s.identity_profile_id IS DISTINCT FROM sa.identity_profile_id
ON CONFLICT (entity_type, entity_id) DO NOTHING;

UPDATE document_requests dr
SET identity_profile_id = sa.identity_profile_id
FROM student_accounts sa
WHERE dr.student_account_id = sa.id;
UPDATE document_requests dr
SET identity_profile_id = s.identity_profile_id
FROM students s
WHERE dr.identity_profile_id IS NULL AND dr.student_no = s.student_no;

UPDATE event_proposals ep
SET identity_profile_id = sa.identity_profile_id
FROM student_accounts sa
WHERE ep.student_account_id = sa.id;
UPDATE event_proposals ep
SET identity_profile_id = s.identity_profile_id
FROM students s
WHERE ep.identity_profile_id IS NULL AND ep.student_no = s.student_no;
UPDATE event_proposals ep
SET identity_profile_id = sip.id
FROM student_identity_profiles sip
WHERE ep.identity_profile_id IS NULL
  AND ep.submitted_by_email IS NOT NULL
  AND lower(sip.email) = lower(ep.submitted_by_email);

INSERT INTO student_identity_link_reviews (
  entity_type, entity_id, student_no, student_account_id,
  registry_profile_id, account_profile_id
)
SELECT 'request_feedback', rf.id, rf.student_no, rf.student_account_id,
       s.identity_profile_id, sa.identity_profile_id
FROM document_request_feedback rf
LEFT JOIN students s ON s.student_no = rf.student_no
LEFT JOIN student_accounts sa ON sa.id = rf.student_account_id
WHERE rf.student_no IS NOT NULL
  AND rf.student_account_id IS NOT NULL
  AND s.identity_profile_id IS DISTINCT FROM sa.identity_profile_id
ON CONFLICT (entity_type, entity_id) DO NOTHING;

UPDATE document_request_feedback rf
SET identity_profile_id = sa.identity_profile_id
FROM student_accounts sa
WHERE rf.student_account_id = sa.id;
UPDATE document_request_feedback rf
SET identity_profile_id = COALESCE(
  (SELECT s.identity_profile_id FROM students s WHERE s.student_no = rf.student_no),
  (SELECT dr.identity_profile_id FROM document_requests dr WHERE dr.id = rf.document_request_id)
)
WHERE rf.identity_profile_id IS NULL;

-- Keep historical rows with no resolvable student/account link visible for
-- manual reconciliation instead of silently omitting them from student views.
INSERT INTO student_identity_link_reviews (entity_type, entity_id, student_no)
SELECT 'document_request', dr.id, dr.student_no
FROM document_requests dr
WHERE dr.identity_profile_id IS NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

INSERT INTO student_identity_link_reviews (entity_type, entity_id, student_no)
SELECT 'event_proposal', ep.id, ep.student_no
FROM event_proposals ep
WHERE ep.identity_profile_id IS NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

INSERT INTO student_identity_link_reviews (entity_type, entity_id, student_no)
SELECT 'request_feedback', rf.id, rf.student_no
FROM document_request_feedback rf
WHERE rf.identity_profile_id IS NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_identity_profile_fk
  FOREIGN KEY (identity_profile_id) REFERENCES student_identity_profiles(id) ON DELETE SET NULL;
ALTER TABLE event_proposals
  ADD CONSTRAINT event_proposals_identity_profile_fk
  FOREIGN KEY (identity_profile_id) REFERENCES student_identity_profiles(id) ON DELETE SET NULL;
ALTER TABLE document_request_feedback
  ADD CONSTRAINT document_request_feedback_identity_profile_fk
  FOREIGN KEY (identity_profile_id) REFERENCES student_identity_profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_document_requests_identity_profile ON document_requests(identity_profile_id);
CREATE INDEX idx_event_proposals_identity_profile ON event_proposals(identity_profile_id);
CREATE INDEX idx_document_request_feedback_identity_profile ON document_request_feedback(identity_profile_id);
