-- Migration 044: Make core digitization modules required across all departments
-- Digitization is the primary objective of PUPSJ-RMS; hence scanning, document repository,
-- verification review, compliance analytics, and backups cannot be revoked from any office.

UPDATE modules
SET is_system = TRUE
WHERE id IN (
  'scan_upload',          -- Scan & Upload with OCR
  'documents',            -- Student Document Matrix & Repository
  'records_review',       -- Document Verification & Approval Review
  'compliance_analytics', -- Digitization Compliance & Completion Metrics
  'backup'                -- Database Backups & Disaster Recovery
);

-- Ensure all existing departments have these required modules enabled in office_modules
INSERT INTO office_modules (office_id, module_id, enabled, updated_at)
SELECT o.id, m.id, TRUE, NOW()
FROM offices o
CROSS JOIN modules m
WHERE m.id IN (
  'scan_upload',
  'documents',
  'records_review',
  'compliance_analytics',
  'backup',
  'audit_logs',
  'notifications'
)
ON CONFLICT (office_id, module_id) DO UPDATE
SET enabled = TRUE,
    updated_at = NOW();
