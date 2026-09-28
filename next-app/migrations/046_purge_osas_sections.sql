-- Migration 046: Purge course blocks (sections) for OSAS office
-- OSAS operates by student organizations, whitelists, and event proposals; course blocks are exclusive to Registrar.

DELETE FROM sections WHERE office_id = 'osas';
