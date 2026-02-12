import { Request, Response, NextFunction } from "express";
import {
  createFolderForUser,
  listFolderForUser,
  registerNewFileVersion,
  getFileMetadataForUser,
  softDeleteFileMetadataForUser
} from "./metadata.service";

export const createFolderHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required" } });
      return;
    }

    const { name, parentFolderId } = req.body as {
      name?: string;
      parentFolderId?: string | null;
    };

    if (!name || !name.trim()) {
      res.status(400).json({ error: { message: "Folder name is required" } });
      return;
    }

    const folder = await createFolderForUser({
      userId: req.user.id,
      userRole: req.user.role,
      name: name.trim(),
      parentFolderId: parentFolderId ?? null
    });

    res.status(201).json({ folder });
  } catch (err) {
    next(err);
  }
};

export const listFolderHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required" } });
      return;
    }

    const folderId = (req.query.folderId as string | undefined) ?? null;

    const data = await listFolderForUser({
      userId: req.user.id,
      userRole: req.user.role,
      folderId
    });

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

export const createFileMetadataHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required" } });
      return;
    }

    const { name, folderId, mimeType, sizeBytes, storageKey, checksum } = req.body as {
      name?: string;
      folderId?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      storageKey?: string;
      checksum?: string | null;
    };

    if (!name || !name.trim()) {
      res.status(400).json({ error: { message: "File name is required" } });
      return;
    }

    if (!storageKey) {
      res.status(400).json({ error: { message: "storageKey is required (points to the blob in S3/local)" } });
      return;
    }

    const result = await registerNewFileVersion({
      userId: req.user.id,
      userRole: req.user.role,
      folderId: folderId ?? null,
      name: name.trim(),
      mimeType: mimeType ?? null,
      sizeBytes: sizeBytes ?? null,
      storageKey,
      checksum: checksum ?? null
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getFileMetadataHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required" } });
      return;
    }

    const { id } = req.params;

    const file = await getFileMetadataForUser({
      userId: req.user.id,
      userRole: req.user.role,
      fileId: id
    });

    if (!file) {
      res.status(404).json({ error: { message: "File not found or access denied" } });
      return;
    }

    res.status(200).json({ file });
  } catch (err) {
    next(err);
  }
};

export const softDeleteFileHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required" } });
      return;
    }

    const { id } = req.params;

    const deleted = await softDeleteFileMetadataForUser({
      userId: req.user.id,
      userRole: req.user.role,
      fileId: id
    });

    if (!deleted) {
      res.status(404).json({ error: { message: "File not found or access denied" } });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

