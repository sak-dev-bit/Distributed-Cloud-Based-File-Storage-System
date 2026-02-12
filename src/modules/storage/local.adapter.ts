import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import { getStorageConfig } from "../../config/s3";

// Local filesystem fallback for development and simple deployments.
// Not meant for massive scale, but very handy for local testing.

export interface UploadResult {
  storageKey: string;
  sizeBytes: number;
  checksum: string;
}

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export const uploadBufferLocal = async (params: {
  key: string;
  buffer: Buffer;
}): Promise<UploadResult> => {
  const cfg = getStorageConfig();
  if (!cfg.localBasePath) {
    throw new Error("Local storage is not configured");
  }

  const fullPath = path.join(cfg.localBasePath, params.key);
  ensureDir(path.dirname(fullPath));

  await fs.promises.writeFile(fullPath, params.buffer);

  const checksum = crypto.createHash("sha256").update(params.buffer).digest("hex");

  return {
    storageKey: params.key,
    sizeBytes: params.buffer.length,
    checksum
  };
};

export const uploadStreamLocal = async (params: {
  key: string;
  stream: Readable;
}): Promise<UploadResult> => {
  const cfg = getStorageConfig();
  if (!cfg.localBasePath) {
    throw new Error("Local storage is not configured");
  }

  const fullPath = path.join(cfg.localBasePath, params.key);
  ensureDir(path.dirname(fullPath));

  const hash = crypto.createHash("sha256");
  let sizeBytes = 0;

  await new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(fullPath);

    params.stream.on("data", (chunk) => {
      sizeBytes += chunk.length;
      hash.update(chunk);
    });

    params.stream.on("error", (err) => {
      writeStream.destroy();
      reject(err);
    });

    writeStream.on("error", reject);
    writeStream.on("finish", () => resolve());

    params.stream.pipe(writeStream);
  });

  const checksum = hash.digest("hex");

  return {
    storageKey: params.key,
    sizeBytes,
    checksum
  };
};

export const getLocalReadStream = (key: string): fs.ReadStream => {
  const cfg = getStorageConfig();
  if (!cfg.localBasePath) {
    throw new Error("Local storage is not configured");
  }

  const fullPath = path.join(cfg.localBasePath, key);
  return fs.createReadStream(fullPath);
};

