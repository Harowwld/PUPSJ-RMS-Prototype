-- Migration 049: Physical Storage Location for OSAS Student Organizations
-- Connects recognized student organizations with physical Room 1 cabinets and drawers.

-- 1. Add storage location columns to student_organizations
ALTER TABLE student_organizations ADD COLUMN IF NOT EXISTS storage_room INTEGER DEFAULT 1;
ALTER TABLE student_organizations ADD COLUMN IF NOT EXISTS storage_cabinet TEXT DEFAULT 'NON-ACADEMIC ORGANIZATIONS';
ALTER TABLE student_organizations ADD COLUMN IF NOT EXISTS storage_drawer TEXT DEFAULT '1';

-- 2. Seed default physical archive storage locations for recognized organizations
UPDATE student_organizations
SET storage_room = 1,
    storage_cabinet = 'ACADEMIC ORGANIZATIONS',
    storage_drawer = '1'
WHERE id = 'jpcs';

UPDATE student_organizations
SET storage_room = 1,
    storage_cabinet = 'NON-ACADEMIC ORGANIZATIONS',
    storage_drawer = '1'
WHERE id = 'helping-hands';

UPDATE student_organizations
SET storage_room = 1,
    storage_cabinet = 'NON-ACADEMIC ORGANIZATIONS',
    storage_drawer = '2'
WHERE id = 'ssc';

UPDATE student_organizations
SET storage_room = 1,
    storage_cabinet = 'NON-ACADEMIC ORGANIZATIONS',
    storage_drawer = '3'
WHERE id = 'rcy';

UPDATE student_organizations
SET storage_room = 1,
    storage_cabinet = 'NON-ACADEMIC ORGANIZATIONS',
    storage_drawer = '4'
WHERE id = 'gaming-guild';
