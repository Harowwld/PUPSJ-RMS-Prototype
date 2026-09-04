-- Migration 031: Add avatar_filename to student_accounts table
ALTER TABLE student_accounts ADD COLUMN IF NOT EXISTS avatar_filename TEXT;
