import {
  createFileWithVersion,
  createFolder,
  getFileByIdForUser,
  getFolderByIdForUser,
  listFolderChildren,
  softDeleteFileForUser,
  FileRecord,
  FileVersion,
  Folder
} from "./metadata.model";
import { UserRole } from "../../config/jwt";

// This service keeps the orchestration and business rules for metadata in one place.
// Controllers should stay thin and only deal with HTTP concerns.

export const createFolderForUser = async (params: {
  userId: string;
  userRole: UserRole;
  name: string;
  parentFolderId?: string | null;
}): Promise<Folder> => {
  // For now, folder creation rules are simple: users can only create under folders
  // they can see. If this project grows, we can add quota/limits checks here.
  if (params.parentFolderId) {
    const parent = await getFolderByIdForUser({
      folderId: params.parentFolderId,
      userId: params.userId,
      userRole: params.userRole
    });
    if (!parent) {
      const err = new Error("Parent folder not found or access denied");
      (err as any).statusCode = 404;
      throw err;
    }
  }

  return createFolder({
    ownerId: params.userId,
    name: params.name,
    parentFolderId: params.parentFolderId ?? null
  });
};

export const listFolderForUser = async (params: {
  userId: string;
  userRole: UserRole;
  folderId?: string | null;
}): Promise<{ folders: Folder[]; files: FileRecord[] }> => {
  const folderId = params.folderId ?? null;
  return listFolderChildren({
    folderId,
    userId: params.userId,
    userRole: params.userRole
  });
};

export const registerNewFileVersion = async (params: {
  userId: string;
  userRole: UserRole;
  folderId?: string | null;
  name: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageKey: string;
  checksum?: string | null;
}): Promise<{ file: FileRecord; version: FileVersion }> => {
  // Basic access control: user must be able to see the target folder.
  if (params.folderId) {
    const folder = await getFolderByIdForUser({
      folderId: params.folderId,
      userId: params.userId,
      userRole: params.userRole
    });
    if (!folder) {
      const err = new Error("Target folder not found or access denied");
      (err as any).statusCode = 404;
      throw err;
    }
  }

  return createFileWithVersion({
    ownerId: params.userId,
    folderId: params.folderId ?? null,
    name: params.name,
    mimeType: params.mimeType ?? null,
    sizeBytes: params.sizeBytes ?? null,
    storageKey: params.storageKey,
    checksum: params.checksum ?? null
  });
};

export const getFileMetadataForUser = async (params: {
  userId: string;
  userRole: UserRole;
  fileId: string;
}): Promise<FileRecord | null> => {
  return getFileByIdForUser({
    fileId: params.fileId,
    userId: params.userId,
    userRole: params.userRole
  });
};

export const softDeleteFileMetadataForUser = async (params: {
  userId: string;
  userRole: UserRole;
  fileId: string;
}): Promise<boolean> => {
  return softDeleteFileForUser({
    fileId: params.fileId,
    userId: params.userId,
    userRole: params.userRole
  });
};

