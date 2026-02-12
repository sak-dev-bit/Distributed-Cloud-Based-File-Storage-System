-- Core schema for a distributed file storage metadata service.
-- This is intentionally straightforward and biased towards clarity over hyper-normalization.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users drive ownership and permissions. Auth code already expects this shape.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Folders allow hierarchical organization. Root folders simply have parent_folder_id = NULL.
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_folder_id UUID REFERENCES folders (id) ON DELETE CASCADE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce unique folder names within the same parent for a given owner.
CREATE UNIQUE INDEX IF NOT EXISTS folders_owner_parent_name_idx
  ON folders (owner_id, COALESCE(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- Files represent logical files, pointing to a current version.
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders (id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150),
  size_bytes BIGINT,
  current_version_id UUID, -- FK set after first version insert
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS files_owner_deleted_idx
  ON files (owner_id, is_deleted);

CREATE INDEX IF NOT EXISTS files_folder_deleted_idx
  ON files (folder_id, is_deleted);

-- File versions track immutable blobs (S3 objects / local paths).
CREATE TABLE IF NOT EXISTS versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files (id) ON DELETE CASCADE,
  storage_key VARCHAR(512) NOT NULL,
  version_number INT NOT NULL,
  checksum VARCHAR(128),
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT versions_file_version_unique UNIQUE (file_id, version_number)
);

CREATE INDEX IF NOT EXISTS versions_file_created_idx
  ON versions (file_id, created_at DESC);

-- Wire files.current_version_id to versions.id after both tables exist.
ALTER TABLE files
  ADD CONSTRAINT files_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES versions (id)
  DEFERRABLE INITIALLY DEFERRED;

-- Permissions allow sharing files/folders with other users.
-- We keep this flexible: a row can target either a file OR a folder.
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  file_id UUID REFERENCES files (id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders (id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL, -- 'viewer' | 'editor'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT permissions_target_check
    CHECK (
      (file_id IS NOT NULL AND folder_id IS NULL) OR
      (file_id IS NULL AND folder_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS permissions_subject_file_idx
  ON permissions (subject_user_id, file_id);

CREATE INDEX IF NOT EXISTS permissions_subject_folder_idx
  ON permissions (subject_user_id, folder_id);

