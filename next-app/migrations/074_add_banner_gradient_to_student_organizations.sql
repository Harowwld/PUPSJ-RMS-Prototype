-- Migration 074: Add banner_gradient to student_organizations
ALTER TABLE student_organizations ADD COLUMN IF NOT EXISTS banner_gradient TEXT DEFAULT 'maroon';
