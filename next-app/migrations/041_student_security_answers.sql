-- Table for student account security question answers
CREATE TABLE IF NOT EXISTS student_security_answers (
  student_account_id BIGINT NOT NULL,
  question_id INTEGER NOT NULL,
  answer_hash TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_account_id, question_id),
  FOREIGN KEY (student_account_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES security_questions(id) ON DELETE CASCADE
);
