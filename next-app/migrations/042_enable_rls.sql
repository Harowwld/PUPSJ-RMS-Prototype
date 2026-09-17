-- 042_enable_rls.sql

-- Enable RLS on core tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- 1. System Admin & Background Jobs Override (Bypass RLS)
-- If the role is SystemAdmin, or if the role isn't set at all (e.g., background cron jobs or unauthenticated routes like login)
CREATE POLICY system_admin_override_students ON students
    FOR ALL
    USING (
        current_setting('app.current_role', true) = 'SystemAdmin'
        OR current_setting('app.current_role', true) IS NULL
    );

CREATE POLICY system_admin_override_documents ON documents
    FOR ALL
    USING (
        current_setting('app.current_role', true) = 'SystemAdmin'
        OR current_setting('app.current_role', true) IS NULL
    );

-- 2. Student Self-Access Policies
-- A student can only select their own record
CREATE POLICY student_self_read ON students
    FOR SELECT
    USING (student_no = current_setting('app.current_user_id', true));

-- A student can only view their own documents
CREATE POLICY student_document_read ON documents
    FOR SELECT
    USING (student_no = current_setting('app.current_user_id', true));

-- 3. Staff & Office Admin Policies
-- Any staff member can view any student profile (standard feature of the directory)
CREATE POLICY staff_read_students ON students
    FOR SELECT
    USING (current_setting('app.current_role', true) IN ('Staff', 'Admin'));

-- A staff member can view documents that belong to their office
CREATE POLICY staff_office_documents ON documents
    FOR SELECT
    USING (
        office_id = current_setting('app.current_office_id', true)
        OR current_setting('app.current_role', true) = 'Admin'
    );
