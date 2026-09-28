-- Migration 049: Add document_request_feedback table for student ratings and feedback

CREATE TABLE IF NOT EXISTS document_request_feedback (
  id BIGSERIAL PRIMARY KEY,
  document_request_id BIGINT NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  student_account_id BIGINT REFERENCES student_accounts(id) ON DELETE SET NULL,
  student_no TEXT REFERENCES students(student_no) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  aspect_tags TEXT[] DEFAULT '{}',
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_document_request_feedback UNIQUE (document_request_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_request_feedback_req ON document_request_feedback(document_request_id);
CREATE INDEX IF NOT EXISTS idx_doc_request_feedback_account ON document_request_feedback(student_account_id);
CREATE INDEX IF NOT EXISTS idx_doc_request_feedback_rating ON document_request_feedback(rating);
