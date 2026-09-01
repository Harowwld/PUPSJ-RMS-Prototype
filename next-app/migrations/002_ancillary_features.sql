-- Ancillary persistence used by storage layout, notifications, and backups.
-- Keep this additive so existing installations that already applied 001 remain safe.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backups (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  checksum TEXT NOT NULL,
  status_local TEXT NOT NULL DEFAULT 'Pending',
  status_external TEXT NOT NULL DEFAULT 'Pending',
  status_offsite TEXT NOT NULL DEFAULT 'Pending',
  encryption_key_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_notification_state (
  staff_id TEXT PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  last_seen_reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_notification_item_states (
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  notification_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_backups_created_at
  ON backups(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backups_filename
  ON backups(filename);

CREATE INDEX IF NOT EXISTS idx_staff_notification_state_updated_at
  ON staff_notification_state(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_item_states_notification
  ON staff_notification_item_states(notification_id, staff_id);

CREATE INDEX IF NOT EXISTS idx_notification_item_states_staff_read
  ON staff_notification_item_states(staff_id, is_read, is_archived);

CREATE INDEX IF NOT EXISTS idx_global_audit_logs_office_created_at
  ON global_audit_logs(office_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_global_audit_logs_action_created_at
  ON global_audit_logs(action, created_at DESC);
