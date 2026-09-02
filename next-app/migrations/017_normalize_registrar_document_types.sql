-- Normalize legacy document-type keys so case differences cannot create duplicates.
DELETE FROM document_types duplicate_type
USING document_types kept_type
WHERE duplicate_type.office_id = 'registrar'
  AND kept_type.office_id = duplicate_type.office_id
  AND lower(trim(kept_type.name)) = lower(trim(duplicate_type.name))
  AND kept_type.id < duplicate_type.id;

UPDATE document_types
SET name_norm = lower(trim(name))
WHERE office_id = 'registrar';
