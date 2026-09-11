-- Migration 038: Remove the insecure scanner-token defaults from migration 020.
-- Deployments must provision HOT_FOLDER_INGEST_TOKEN through the secret store.
UPDATE offices
SET ingest_token = NULL
WHERE ingest_token LIKE 'station_token_%';
