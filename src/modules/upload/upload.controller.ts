import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { storeBuffer, storeChunks, buildStorageKey } from "../storage/storage.service";
import { registerNewFileVersion } from "../metadata/metadata.service";
import { recordUploadBytes } from "../monitor/metrics.service";
import { validateUploadFile } from "../security/validator.service";
import { scanBufferForMalware } from "../security/scan.service";

// Single-shot upload: one request, one file in memory.
export const singleUploadHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required" } });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: { message: "No file provided" } });
      return;
    }

    const { folderId } = req.body as { folderId?: string | null };

    const validation = validateUploadFile({
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size
    });
    if (!validation.valid) {
      res.status(400).json({ error: { message: validation.message } });
      return;
    }

    const scanResult = await scanBufferForMalware(file.buffer, { fileName: file.originalname });
    if (!scanResult.clean) {
      res.status(400).json({ error: { message: scanResult.reason ?? "File failed security checks" } });
      return;
    }

    const checksum = crypto.createHash("sha256").update(file.buffer).digest("hex");
    const key = buildStorageKey(req.user.id, file.originalname);

    const uploadResult = await storeBuffer({
      key,
      mimeType: file.mimetype,
      buffer: file.buffer,
      expectedChecksum: checksum
    });

    recordUploadBytes(uploadResult.sizeBytes);

    const { file: fileMeta, version } = await registerNewFileVersion({
      userId: req.user.id,
      userRole: req.user.role,
      folderId: folderId ?? null,
      name: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: uploadResult.sizeBytes,
      storageKey: uploadResult.storageKey,
      checksum: uploadResult.checksum
    });

    res.status(201).json({
      file: fileMeta,
      version
    });
  } catch (err) {
    next(err);
  }
};

// Chunked upload: for the sake of this project, we'll assume the client sends
// chunks in order and we buffer them server-side. In a real system you'd likely
// stream directly to S3 multipart upload instead.
export const chunkedUploadHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required" } });
      return;
    }

    const chunks = (req as any).files as Express.Multer.File[] | undefined;
    if (!chunks || chunks.length === 0) {
      res.status(400).json({ error: { message: "No chunks provided" } });
      return;
    }

    const { fileName, folderId } = req.body as {
      fileName?: string;
      folderId?: string | null;
    };

    if (!fileName) {
      res.status(400).json({ error: { message: "fileName is required for chunked uploads" } });
      return;
    }

    const chunkInfos = chunks.map((chunk, idx) => ({
      index: idx,
      buffer: chunk.buffer
    }));

    const key = buildStorageKey(req.user.id, fileName);
    const uploadResult = await storeChunks({
      key,
      mimeType: chunks[0].mimetype,
      chunks: chunkInfos
    });

    recordUploadBytes(uploadResult.sizeBytes);

    const { file: fileMeta, version } = await registerNewFileVersion({
      userId: req.user.id,
      userRole: req.user.role,
      folderId: folderId ?? null,
      name: fileName,
      mimeType: chunks[0].mimetype,
      sizeBytes: uploadResult.sizeBytes,
      storageKey: uploadResult.storageKey,
      checksum: uploadResult.checksum
    });

    res.status(201).json({
      file: fileMeta,
      version
    });
  } catch (err) {
    next(err);
  }
};

