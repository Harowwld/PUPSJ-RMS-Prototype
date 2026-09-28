-- Migration 047: Reorder Records Archive sidebar group
-- Move student_organizations and student_directory to the top of Records Archive.

UPDATE modules SET sidebar_group = 'Records Archive', sort_order = 5 WHERE id = 'student_directory';
UPDATE modules SET sidebar_group = 'Records Archive', sort_order = 6 WHERE id = 'student_organizations';
UPDATE modules SET sidebar_group = 'Records Archive', sort_order = 7 WHERE id = 'records_archive';
UPDATE modules SET sidebar_group = 'Records Archive', sort_order = 8 WHERE id = 'storage_explorer';
