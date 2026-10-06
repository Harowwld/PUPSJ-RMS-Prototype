ALTER TABLE organization_bylaws_versions
  ADD COLUMN size_bytes BIGINT,
  ADD COLUMN mime_type TEXT NOT NULL DEFAULT 'application/pdf';

UPDATE organization_bylaws_versions obv
SET size_bytes = so.bylaws_size_bytes,
    mime_type = COALESCE(so.bylaws_mime_type, 'application/pdf')
FROM student_organizations so
WHERE obv.organization_id = so.id
  AND obv.storage_filename = so.bylaws_storage_filename;

-- Preserve legacy current bylaws that were written to student_organizations
-- after versioning was introduced and therefore have no matching version row.
INSERT INTO organization_bylaws_versions (
  organization_id, version_tag, storage_filename, original_filename,
  size_bytes, mime_type, amendment_summary, status, effective_date,
  created_at, updated_at
)
SELECT so.id, 'Legacy Current', so.bylaws_storage_filename,
       COALESCE(so.bylaws_original_filename, so.name || '-CBL.pdf'),
       so.bylaws_size_bytes, COALESCE(so.bylaws_mime_type, 'application/pdf'),
       'Preserved from the legacy organization record during normalization.',
       'Approved', COALESCE(so.bylaws_updated_at::DATE, CURRENT_DATE),
       COALESCE(so.bylaws_updated_at, NOW()), COALESCE(so.bylaws_updated_at, NOW())
FROM student_organizations so
WHERE so.bylaws_storage_filename IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_bylaws_versions obv
    WHERE obv.organization_id = so.id
      AND obv.storage_filename = so.bylaws_storage_filename
  );

WITH ranked_approved_versions AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY organization_id
           ORDER BY effective_date DESC NULLS LAST, created_at DESC, id DESC
         ) AS version_rank
  FROM organization_bylaws_versions
  WHERE status = 'Approved'
)
UPDATE organization_bylaws_versions obv
SET status = 'Superseded', updated_at = NOW()
FROM ranked_approved_versions ranked
WHERE ranked.id = obv.id AND ranked.version_rank > 1;

CREATE UNIQUE INDEX idx_one_approved_bylaws_version_per_org
  ON organization_bylaws_versions(organization_id)
  WHERE status = 'Approved';

ALTER TABLE student_organizations DROP COLUMN bylaws_storage_filename;
ALTER TABLE student_organizations DROP COLUMN bylaws_original_filename;
ALTER TABLE student_organizations DROP COLUMN bylaws_size_bytes;
ALTER TABLE student_organizations DROP COLUMN bylaws_mime_type;
ALTER TABLE student_organizations DROP COLUMN bylaws_updated_at;
