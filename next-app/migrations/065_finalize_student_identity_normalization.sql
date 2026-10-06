-- Keep student display-name changes compatible with the canonical identity
-- profile after the legacy account profile columns have been removed.
CREATE OR REPLACE FUNCTION sync_student_identity_profile() RETURNS trigger AS $$
BEGIN
  UPDATE student_identity_profiles
     SET first_name = NULL,
         middle_name = NULL,
         last_name = NULL,
         display_name = NEW.name,
         updated_at = NOW()
   WHERE id = NEW.identity_profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Expose secondary accounts for the same registry number in the reconciliation
-- queue. They remain distinct login identities until an operator reviews them.
ALTER TABLE student_identity_link_reviews
  DROP CONSTRAINT student_identity_link_reviews_entity_type_check;
ALTER TABLE student_identity_link_reviews
  ADD CONSTRAINT student_identity_link_reviews_entity_type_check
  CHECK (entity_type IN ('student_account', 'document_request', 'event_proposal', 'request_feedback'));

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
