-- Add JSONB preferences column to student_accounts so student personal settings
-- (accessibility, interface sounds, display format, zoom, etc.) persist server-side
-- across devices and sessions, matching staff.preferences.
ALTER TABLE student_accounts
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
