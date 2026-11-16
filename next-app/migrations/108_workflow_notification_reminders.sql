ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS pickup_claim_by date;
ALTER TABLE portal_workflow_notifications ADD COLUMN IF NOT EXISTS detail text;

CREATE TABLE IF NOT EXISTS workflow_notification_occurrences (
  event_key text NOT NULL,
  occurrence_key text NOT NULL,
  PRIMARY KEY (event_key, occurrence_key)
);

-- Recover the beginning of the current Ready period from the status timeline.
WITH first_ready AS (
  SELECT request.id, min(update_log.created_at) AS ready_at
    FROM document_requests request
    JOIN transaction_updates update_log ON update_log.document_request_id = request.id
   WHERE request.office_id = 'registrar' AND request.status = 'Ready'
     AND request.doc_type <> 'Missing Documents Inquiry'
     AND update_log.status = 'Ready'
     AND update_log.id > COALESCE((
       SELECT max(previous.id) FROM transaction_updates previous
        WHERE previous.document_request_id = request.id AND previous.status <> 'Ready'
     ), 0)
   GROUP BY request.id
)
UPDATE document_requests request
   SET pickup_claim_by = (first_ready.ready_at AT TIME ZONE 'Asia/Manila')::date + 90
  FROM first_ready
 WHERE request.id = first_ready.id AND request.pickup_claim_by IS NULL;

CREATE OR REPLACE FUNCTION set_request_pickup_claim_by() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.office_id <> 'registrar' OR NEW.doc_type = 'Missing Documents Inquiry' OR NEW.status <> 'Ready' THEN
    NEW.pickup_claim_by := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.pickup_claim_by := (now() AT TIME ZONE 'Asia/Manila')::date + 90;
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.pickup_claim_by := (now() AT TIME ZONE 'Asia/Manila')::date + 90;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_requests_pickup_claim_by ON document_requests;
CREATE TRIGGER document_requests_pickup_claim_by
  BEFORE INSERT OR UPDATE OF status, doc_type ON document_requests
  FOR EACH ROW EXECUTE FUNCTION set_request_pickup_claim_by();

CREATE INDEX IF NOT EXISTS document_requests_pickup_reminders
  ON document_requests (pickup_claim_by) WHERE status = 'Ready' AND portal_submitter_account_id IS NOT NULL;
