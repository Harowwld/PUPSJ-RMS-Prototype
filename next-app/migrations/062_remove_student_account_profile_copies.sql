DROP TRIGGER student_accounts_identity_profile_insert ON student_accounts;
DROP TRIGGER student_accounts_identity_profile_update ON student_accounts;

ALTER TABLE student_accounts DROP COLUMN email;
ALTER TABLE student_accounts DROP COLUMN first_name;
ALTER TABLE student_accounts DROP COLUMN middle_name;
ALTER TABLE student_accounts DROP COLUMN last_name;
ALTER TABLE student_accounts DROP COLUMN client_type;
