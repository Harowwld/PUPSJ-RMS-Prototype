-- Allow 'Archived' status and 'SystemAdmin' role on the staff table.
ALTER TABLE staff
  DROP CONSTRAINT IF EXISTS staff_status_check;

ALTER TABLE staff
  ADD CONSTRAINT staff_status_check
  CHECK (status IN ('Active', 'Inactive', 'Archived'));

ALTER TABLE staff
  DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE staff
  ADD CONSTRAINT staff_role_check
  CHECK (role IN ('SuperAdmin', 'SystemAdmin', 'Admin', 'Staff'));
