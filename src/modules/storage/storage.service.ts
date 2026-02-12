import { Readable } from "stream";
import { getStorageConfig } from "../../config/s3";
import { uploadBuffer } from "./s3.adapter";
import { uploadBufferLocal } from "./local.adapter";
import { concatChunks, ChunkInfo } from "./chunk.manager";

// This service sits between controllers and the low-level adapters.
// It decides which backend to use (S3 vs local), and handles simple retries
// and checksum expectations.

export interface StoreFileParams {
  key: string;
  mimeType?: string;
  buffer: Buffer;
  expectedChecksum?: string;
}

export const storeBuffer = async (params: StoreFileParams) => {
  const cfg = getStorageConfig();

  if (cfg.driver === "s3") {
    return uploadBuffer({
      key: params.key,
      buffer: params.buffer,
      mimeType: params.mimeType,
      expectedChecksum: params.expectedChecksum
    });
  }

  // Local fallback ignores expectedChecksum during write, but the caller can
  // compare the returned checksum to enforce integrity.
  const result = await uploadBufferLocal({
    key: params.key,
    buffer: params.buffer
  });

  if (params.expectedChecksum && result.checksum !== params.expectedChecksum) {
    const err = new Error("Checksum mismatch after local upload");
    (err as any).statusCode = 409;
    throw err;
  }

  return result;
};

export const storeChunks = async (params: {
  key: string;
  mimeType?: string;
  chunks: ChunkInfo[];
  expectedChecksum?: string;
}) => {
  const buffer = concatChunks(params.chunks);
  return storeBuffer({
    key: params.key,
    mimeType: params.mimeType,
    buffer,
    expectedChecksum: params.expectedChecksum
  });
};

export const buildStorageKey = (userId: string, fileName: string): string => {
  // Simple, readable layout: user/<userId>/uploads/<timestamp>-<filename>
  const safeName = fileName.replace(/[^\w.-]+/g, "_");
  const timestamp = Date.now();
  return `user/${userId}/uploads/${timestamp}-${safeName}`;
};

