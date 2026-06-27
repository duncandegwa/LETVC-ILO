-- ============================================================
-- LETVC ILO — Industrial Attachment Management System
-- Supabase PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'student')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEPARTMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COURSES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id   UUID REFERENCES departments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  duration_years  INTEGER DEFAULT 3,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STUDENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  admission_number  TEXT UNIQUE NOT NULL,
  full_name         TEXT NOT NULL,
  national_id       TEXT UNIQUE NOT NULL,
  gender            TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  course            TEXT NOT NULL,
  department        TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  phone_number      TEXT NOT NULL,
  academic_year     TEXT NOT NULL,
  class_name        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  profile_photo     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRAINERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  staff_number    TEXT UNIQUE NOT NULL,
  department      TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone_number    TEXT NOT NULL,
  position        TEXT NOT NULL,
  specialization  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  profile_photo   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATTACHMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  industry_name     TEXT NOT NULL,
  specific_area     TEXT NOT NULL,
  county            TEXT NOT NULL,
  supervisor_name   TEXT NOT NULL,
  supervisor_phone  TEXT NOT NULL,
  student_phone     TEXT NOT NULL,
  date_attached     DATE NOT NULL,
  remarks           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRAINER ASSIGNMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainer_assignments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  trainer_id   UUID REFERENCES trainers(id) ON DELETE SET NULL,
  assigned_by  UUID REFERENCES users(id),
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ASSESSMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  trainer_id       UUID REFERENCES trainers(id) ON DELETE SET NULL,
  attachment_id    UUID REFERENCES attachments(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSESSED')),
  assessment_date  TIMESTAMPTZ,
  trainer_remarks  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUDIT LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   TEXT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_user_id         ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_admission       ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_department      ON students(department);
CREATE INDEX IF NOT EXISTS idx_students_status          ON students(status);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id         ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_trainers_department      ON trainers(department);
CREATE INDEX IF NOT EXISTS idx_attachments_student_id   ON attachments(student_id);
CREATE INDEX IF NOT EXISTS idx_attachments_county       ON attachments(county);
CREATE INDEX IF NOT EXISTS idx_assignments_student      ON trainer_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_trainer      ON trainer_assignments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_student      ON assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_trainer      ON assessments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status       ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user          ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created       ON audit_logs(created_at);

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_trainers_updated_at
  BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_attachments_updated_at
  BEFORE UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE students           ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies are enforced server-side.
-- For development/testing, you may disable RLS or use service role key.
-- Production: Implement per-role policies using auth.uid() from Supabase Auth,
-- OR use the service_role key exclusively for server-side API operations.

-- Allow service role full access (backend uses SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "Service role full access - users"
  ON users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - students"
  ON students FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - trainers"
  ON trainers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - attachments"
  ON attachments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - assignments"
  ON trainer_assignments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - assessments"
  ON assessments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - audit_logs"
  ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ─── SEED DATA ──────────────────────────────────────────────

-- Admin user (password: Admin@Letvc2024)
INSERT INTO users (id, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@letvc.ac.ke', 'admin')
ON CONFLICT DO NOTHING;

-- Sample departments
INSERT INTO departments (name, code) VALUES
  ('School of Engineering', 'ENG'),
  ('School of ICT', 'ICT'),
  ('School of Business', 'BUS'),
  ('School of Hospitality', 'HOS'),
  ('School of Agriculture', 'AGR')
ON CONFLICT DO NOTHING;
