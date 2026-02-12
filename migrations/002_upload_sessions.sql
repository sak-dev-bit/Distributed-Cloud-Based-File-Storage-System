-- Tracks in-progress and completed upload sessions to support chunked/multipart uploads.

CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150),
  expected_size BIGINT,
  expected_checksum VARCHAR(128),
  storage_driver VARCHAR(20) NOT NULL, -- 's3' | 'local'
  storage_key VARCHAR(512),           -- final object key when known
  multipart_upload_id VARCHAR(255),   -- S3 multipart upload id if used
  received_bytes BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS upload_sessions_user_status_idx
  ON upload_sessions (user_id, status);

