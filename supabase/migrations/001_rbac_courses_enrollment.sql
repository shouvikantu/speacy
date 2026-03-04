-- ============================================================
-- Migration: RBAC, Courses, Enrollments, Audit Logs
-- ============================================================

-- 1. Update profiles role constraint to include 'superuser'
-- First drop the existing constraint if it exists, then add the new one.
DO $$
BEGIN
    -- Try to drop existing check constraint on role (name may vary)
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'professor', 'superuser'));

-- 2. Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    join_code TEXT NOT NULL UNIQUE,
    joining_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_faculty_id ON courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_courses_join_code ON courses(join_code);

-- 3. Create enrollment status type and enrollments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_status') THEN
        CREATE TYPE enrollment_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status enrollment_status DEFAULT 'pending',
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- 4. Create exam status type and add to assignments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_status') THEN
        CREATE TYPE exam_status AS ENUM ('draft', 'published', 'active', 'closed');
    END IF;
END $$;

-- Add course_id and exam_status columns to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS exam_status exam_status DEFAULT 'published';

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_exam_status ON assignments(exam_status);

-- 5. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 6. Backfill: Create a "General" course for each professor with existing assignments
-- and link orphaned assignments to it.
DO $$
DECLARE
    prof RECORD;
    new_course_id UUID;
    code TEXT;
BEGIN
    FOR prof IN
        SELECT DISTINCT p.id, p.email
        FROM profiles p
        JOIN assignments a ON a.created_by = p.id
        WHERE p.role = 'professor'
          AND a.course_id IS NULL
    LOOP
        -- Generate a simple join code
        code := 'GEN-' || UPPER(SUBSTRING(MD5(prof.id::text || NOW()::text) FROM 1 FOR 4));

        INSERT INTO courses (name, description, faculty_id, join_code)
        VALUES ('General', 'Auto-created course for existing assignments', prof.id, code)
        RETURNING id INTO new_course_id;

        UPDATE assignments
        SET course_id = new_course_id
        WHERE created_by = prof.id AND course_id IS NULL;
    END LOOP;
END $$;

-- 7. RLS Policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Courses: faculty can manage their own; students can read courses they're enrolled in; superusers see all
CREATE POLICY courses_faculty_all ON courses
    FOR ALL USING (faculty_id = auth.uid());

CREATE POLICY courses_student_read ON courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = courses.id
              AND e.user_id = auth.uid()
              AND e.status = 'approved'
        )
    );

CREATE POLICY courses_superuser_all ON courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'superuser'
        )
    );

-- Enrollments: students can read/insert their own; faculty can manage enrollments for their courses
CREATE POLICY enrollments_student_read ON enrollments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY enrollments_student_insert ON enrollments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY enrollments_faculty_all ON enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = enrollments.course_id
              AND c.faculty_id = auth.uid()
        )
    );

CREATE POLICY enrollments_superuser_all ON enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'superuser'
        )
    );

-- Audit logs: only superusers can read; any authenticated user can insert (system writes)
CREATE POLICY audit_logs_superuser_read ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'superuser'
        )
    );

CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
