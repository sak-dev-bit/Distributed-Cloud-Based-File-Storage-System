import { dbPool } from "../../config/db";
import { UserRole } from "../../config/jwt";

export interface Folder {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileRecord {
  id: string;
  ownerId: string;
  folderId: string | null;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  currentVersionId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileVersion {
  id: string;
  fileId: string;
  storageKey: string;
  versionNumber: number;
  checksum: string | null;
  sizeBytes: number | null;
  createdAt: Date;
}

export const createFolder = async (params: {
  ownerId: string;
  name: string;
  parentFolderId?: string | null;
}): Promise<Folder> => {
  const result = await dbPool.query(
    `
      INSERT INTO folders (owner_id, name, parent_folder_id)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        owner_id      AS "ownerId",
        name,
        parent_folder_id AS "parentFolderId",
        is_deleted    AS "isDeleted",
        created_at    AS "createdAt",
        updated_at    AS "updatedAt"
    `,
    [params.ownerId, params.name, params.parentFolderId ?? null]
  );
  return result.rows[0];
};

export const getFolderByIdForUser = async (params: {
  folderId: string;
  userId: string;
  userRole: UserRole;
}): Promise<Folder | null> => {
  // Admins can see any folder that isn't deleted.
  if (params.userRole === "admin") {
    const result = await dbPool.query(
      `
        SELECT
          id,
          owner_id       AS "ownerId",
          name,
          parent_folder_id AS "parentFolderId",
          is_deleted     AS "isDeleted",
          created_at     AS "createdAt",
          updated_at     AS "updatedAt"
        FROM folders
        WHERE id = $1 AND is_deleted = FALSE
      `,
      [params.folderId]
    );
    return result.rows[0] ?? null;
  }

  // Regular users must own the folder or have explicit permission.
  const result = await dbPool.query(
    `
      SELECT
        f.id,
        f.owner_id       AS "ownerId",
        f.name,
        f.parent_folder_id AS "parentFolderId",
        f.is_deleted     AS "isDeleted",
        f.created_at     AS "createdAt",
        f.updated_at     AS "updatedAt"
      FROM folders f
      LEFT JOIN permissions p
        ON p.folder_id = f.id
       AND p.subject_user_id = $2
      WHERE f.id = $1
        AND f.is_deleted = FALSE
        AND (f.owner_id = $2 OR p.id IS NOT NULL)
    `,
    [params.folderId, params.userId]
  );

  return result.rows[0] ?? null;
};

export const listFolderChildren = async (params: {
  folderId: string | null;
  userId: string;
  userRole: UserRole;
}): Promise<{ folders: Folder[]; files: FileRecord[] }> => {
  const isRoot = params.folderId === null;

  // Folders visible to user
  const folderQuery = params.userRole === "admin"
    ? `
      SELECT
        id,
        owner_id       AS "ownerId",
        name,
        parent_folder_id AS "parentFolderId",
        is_deleted     AS "isDeleted",
        created_at     AS "createdAt",
        updated_at     AS "updatedAt"
      FROM folders
      WHERE ${isRoot ? "parent_folder_id IS NULL" : "parent_folder_id = $1"}
        AND is_deleted = FALSE
    `
    : `
      SELECT DISTINCT
        f.id,
        f.owner_id       AS "ownerId",
        f.name,
        f.parent_folder_id AS "parentFolderId",
        f.is_deleted     AS "isDeleted",
        f.created_at     AS "createdAt",
        f.updated_at     AS "updatedAt"
      FROM folders f
      LEFT JOIN permissions p
        ON p.folder_id = f.id
       AND p.subject_user_id = $2
      WHERE ${isRoot ? "f.parent_folder_id IS NULL" : "f.parent_folder_id = $1"}
        AND f.is_deleted = FALSE
        AND (f.owner_id = $2 OR p.id IS NOT NULL)
    `;

  const folderParams = params.userRole === "admin"
    ? isRoot ? [] : [params.folderId]
    : isRoot ? [null, params.userId] : [params.folderId, params.userId];

  const folderResult = await dbPool.query(folderQuery, folderParams);

  // Files visible to user
  const fileQuery = params.userRole === "admin"
    ? `
      SELECT
        id,
        owner_id      AS "ownerId",
        folder_id     AS "folderId",
        name,
        mime_type     AS "mimeType",
        size_bytes    AS "sizeBytes",
        current_version_id AS "currentVersionId",
        is_deleted    AS "isDeleted",
        created_at    AS "createdAt",
        updated_at    AS "updatedAt"
      FROM files
      WHERE ${isRoot ? "folder_id IS NULL" : "folder_id = $1"}
        AND is_deleted = FALSE
    `
    : `
      SELECT DISTINCT
        f.id,
        f.owner_id      AS "ownerId",
        f.folder_id     AS "folderId",
        f.name,
        f.mime_type     AS "mimeType",
        f.size_bytes    AS "sizeBytes",
        f.current_version_id AS "currentVersionId",
        f.is_deleted    AS "isDeleted",
        f.created_at    AS "createdAt",
        f.updated_at    AS "updatedAt"
      FROM files f
      LEFT JOIN permissions p
        ON p.file_id = f.id
       AND p.subject_user_id = $2
      WHERE ${isRoot ? "f.folder_id IS NULL" : "f.folder_id = $1"}
        AND f.is_deleted = FALSE
        AND (f.owner_id = $2 OR p.id IS NOT NULL)
    `;

  const fileParams = params.userRole === "admin"
    ? isRoot ? [] : [params.folderId]
    : isRoot ? [null, params.userId] : [params.folderId, params.userId];

  const fileResult = await dbPool.query(fileQuery, fileParams);

  return {
    folders: folderResult.rows,
    files: fileResult.rows
  };
};

export const createFileWithVersion = async (params: {
  ownerId: string;
  folderId?: string | null;
  name: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageKey: string;
  checksum?: string | null;
}): Promise<{ file: FileRecord; version: FileVersion }> => {
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    const fileResult = await client.query(
      `
        INSERT INTO files (owner_id, folder_id, name, mime_type, size_bytes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          owner_id      AS "ownerId",
          folder_id     AS "folderId",
          name,
          mime_type     AS "mimeType",
          size_bytes    AS "sizeBytes",
          current_version_id AS "currentVersionId",
          is_deleted    AS "isDeleted",
          created_at    AS "createdAt",
          updated_at    AS "updatedAt"
      `,
      [params.ownerId, params.folderId ?? null, params.name, params.mimeType ?? null, params.sizeBytes ?? null]
    );

    const file: FileRecord = fileResult.rows[0];

    const versionResult = await client.query(
      `
        INSERT INTO versions (file_id, storage_key, version_number, checksum, size_bytes)
        VALUES ($1, $2, 1, $3, $4)
        RETURNING
          id,
          file_id       AS "fileId",
          storage_key   AS "storageKey",
          version_number AS "versionNumber",
          checksum,
          size_bytes    AS "sizeBytes",
          created_at    AS "createdAt"
      `,
      [file.id, params.storageKey, params.checksum ?? null, params.sizeBytes ?? null]
    );

    const version: FileVersion = versionResult.rows[0];

    await client.query(
      `
        UPDATE files
        SET current_version_id = $1, updated_at = now()
        WHERE id = $2
      `,
      [version.id, file.id]
    );

    await client.query("COMMIT");

    file.currentVersionId = version.id;
    return { file, version };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const getFileByIdForUser = async (params: {
  fileId: string;
  userId: string;
  userRole: UserRole;
}): Promise<FileRecord | null> => {
  if (params.userRole === "admin") {
    const result = await dbPool.query(
      `
        SELECT
          id,
          owner_id      AS "ownerId",
          folder_id     AS "folderId",
          name,
          mime_type     AS "mimeType",
          size_bytes    AS "sizeBytes",
          current_version_id AS "currentVersionId",
          is_deleted    AS "isDeleted",
          created_at    AS "createdAt",
          updated_at    AS "updatedAt"
        FROM files
        WHERE id = $1
          AND is_deleted = FALSE
      `,
      [params.fileId]
    );
    return result.rows[0] ?? null;
  }

  const result = await dbPool.query(
    `
      SELECT DISTINCT
        f.id,
        f.owner_id      AS "ownerId",
        f.folder_id     AS "folderId",
        f.name,
        f.mime_type     AS "mimeType",
        f.size_bytes    AS "sizeBytes",
        f.current_version_id AS "currentVersionId",
        f.is_deleted    AS "isDeleted",
        f.created_at    AS "createdAt",
        f.updated_at    AS "updatedAt"
      FROM files f
      LEFT JOIN permissions p
        ON p.file_id = f.id
       AND p.subject_user_id = $2
      WHERE f.id = $1
        AND f.is_deleted = FALSE
        AND (f.owner_id = $2 OR p.id IS NOT NULL)
    `,
    [params.fileId, params.userId]
  );

  return result.rows[0] ?? null;
};

export const softDeleteFileForUser = async (params: {
  fileId: string;
  userId: string;
  userRole: UserRole;
}): Promise<boolean> => {
  if (params.userRole === "admin") {
    const result = await dbPool.query(
      `
        UPDATE files
        SET is_deleted = TRUE, updated_at = now()
        WHERE id = $1 AND is_deleted = FALSE
      `,
      [params.fileId]
    );
    return result.rowCount === 1;
  }

  const result = await dbPool.query(
    `
      UPDATE files
      SET is_deleted = TRUE, updated_at = now()
      WHERE id = $1
        AND owner_id = $2
        AND is_deleted = FALSE
    `,
    [params.fileId, params.userId]
  );

  return result.rowCount === 1;
};

export const getVersionById = async (id: string): Promise<FileVersion | null> => {
  const result = await dbPool.query(
    `
      SELECT
        id,
        file_id       AS "fileId",
        storage_key   AS "storageKey",
        version_number AS "versionNumber",
        checksum,
        size_bytes    AS "sizeBytes",
        created_at    AS "createdAt"
      FROM versions
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
};


