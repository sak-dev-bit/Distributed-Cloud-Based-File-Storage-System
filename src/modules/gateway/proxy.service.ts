import { Response } from "express";
import { getStorageConfig } from "../../config/s3";
import { getLocalReadStream } from "../storage/local.adapter";
import { getObjectStream } from "../storage/s3.adapter";
import { getFileMetadataForUser } from "../metadata/metadata.service";
import { getVersionById } from "../metadata/metadata.model";
import { UserRole } from "../../config/jwt";
import { recordDownloadBytes } from "../monitor/metrics.service";

interface StreamFileParams {
  fileId: string;
  userId: string;
  userRole: UserRole;
  res: Response;
}

// Gateway-facing helper that pulls metadata + storage info and streams file bytes
// back to the client. Keeps controllers small and reusable.
export const streamFileToResponse = async ({ fileId, userId, userRole, res }: StreamFileParams): Promise<void> => {
  const file = await getFileMetadataForUser({ fileId, userId, userRole });
  if (!file || !file.currentVersionId) {
    res.status(404).json({ error: { message: "File not found or access denied" } });
    return;
  }

  const version = await getVersionById(file.currentVersionId);
  if (!version) {
    res.status(502).json({ error: { message: "File version metadata is missing" } });
    return;
  }

  const cfg = getStorageConfig();

  let contentType = file.mimeType || "application/octet-stream";
  const fileName = file.name || "download";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
  if (version.sizeBytes != null) {
    res.setHeader("Content-Length", version.sizeBytes.toString());
  }

  try {
    if (cfg.driver === "s3") {
      const s3Object = getObjectStream(version.storageKey);
      const stream = s3Object.createReadStream();

      stream.on("data", (chunk) => {
        recordDownloadBytes(chunk.length);
      });

      stream.on("error", (err) => {
        // We can't safely write JSON here if headers are already sent.
        if (!res.headersSent) {
          res.status(502).json({ error: { message: "Failed to stream file from storage" } });
        } else {
          res.end();
        }
      });

      stream.pipe(res);
    } else {
      const stream = getLocalReadStream(version.storageKey);

      stream.on("data", (chunk) => {
        recordDownloadBytes(chunk.length);
      });

      stream.on("error", () => {
        if (!res.headersSent) {
          res.status(502).json({ error: { message: "Failed to stream file from local storage" } });
        } else {
          res.end();
        }
      });
      stream.pipe(res);
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: { message: "Unexpected error while streaming file" } });
    } else {
      res.end();
    }
  }
};

