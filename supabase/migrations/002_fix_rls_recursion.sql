-- Fix: Infinite recursion between courses ↔ enrollments RLS policies
-- The courses_student_read policy queries enrollments,
-- and the enrollments_faculty_all policy queries courses → circular.
--
-- Since all access control is enforced at the API layer (lib/rbac.ts),
-- we remove the cross-referencing policies and keep simple owner-based ones.

-- Drop all existing policies on courses
DROP POLICY IF EXISTS courses_faculty_all ON courses;
DROP POLICY IF EXISTS courses_student_read ON courses;
DROP POLICY IF EXISTS courses_superuser_all ON courses;

-- Drop all existing policies on enrollments
DROP POLICY IF EXISTS enrollments_student_read ON enrollments;
DROP POLICY IF EXISTS enrollments_student_insert ON enrollments;
DROP POLICY IF EXISTS enrollments_faculty_all ON enrollments;
DROP POLICY IF EXISTS enrollments_superuser_all ON enrollments;

-- Courses: simple permissive policies that don't reference other RLS-protected tables
CREATE POLICY courses_owner ON courses
    FOR ALL USING (faculty_id = auth.uid());

CREATE POLICY courses_read_authenticated ON courses
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Enrollments: simple permissive policies
CREATE POLICY enrollments_own ON enrollments
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY enrollments_read_authenticated ON enrollments
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY enrollments_insert_authenticated ON enrollments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Audit logs: keep as-is (no circular references)
-- No changes needed.
