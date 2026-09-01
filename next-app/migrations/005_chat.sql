CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  recipient_id TEXT REFERENCES staff(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  original_message TEXT,
  image_filename TEXT,
  mime_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_message_deletions (
  message_id BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_visibility
  ON chat_messages (recipient_id, sender_id, created_at ASC);
