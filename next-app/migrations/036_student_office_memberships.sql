-- Keep the student registry globally keyed by student number while recording
-- which offices are allowed to operate on each registry record.
CREATE TABLE IF NOT EXISTS student_office_memberships (
  student_no TEXT NOT NULL REFERENCES students(student_no) ON DELETE CASCADE,
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_no, office_id)
);

-- Existing records came from the original registrar-owned registry. Future
-- imports and admin-created records must explicitly create their membership.
INSERT INTO student_office_memberships (student_no, office_id)
SELECT s.student_no, 'registrar'
FROM students s
WHERE EXISTS (SELECT 1 FROM offices WHERE id = 'registrar')
ON CONFLICT (student_no, office_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_student_office_memberships_office_student
  ON student_office_memberships(office_id, student_no);
