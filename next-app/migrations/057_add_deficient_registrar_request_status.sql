-- Add a non-terminal status for requests that need additional student requirements.
ALTER TABLE document_requests
  DROP CONSTRAINT IF EXISTS document_requests_status_check;

ALTER TABLE document_requests
  ADD CONSTRAINT document_requests_status_check
  CHECK (status IN ('Pending', 'Deficient', 'InProgress', 'Ready', 'Completed', 'Cancelled', 'Shredded'));
