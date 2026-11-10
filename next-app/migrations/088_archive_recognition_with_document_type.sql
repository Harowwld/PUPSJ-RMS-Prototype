ALTER TABLE recognition_templates
  ADD COLUMN IF NOT EXISTS archived_with_document_type BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE recognition_templates rt
   SET status = 'Archived', archived_with_document_type = TRUE, updated_at = NOW()
  FROM document_types dt
 WHERE dt.id = rt.document_type_id
   AND dt.office_id = rt.office_id
   AND dt.status <> 'Active'
   AND rt.status = 'Active';
