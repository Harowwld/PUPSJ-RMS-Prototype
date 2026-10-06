-- Backfill unresolved transaction records into the reconciliation queue for
-- databases that already applied the initial normalization migrations.
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
