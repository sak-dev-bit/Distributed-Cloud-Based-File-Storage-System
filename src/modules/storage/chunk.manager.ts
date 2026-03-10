import crypto from "crypto";
import { Readable } from "stream";

// This module focuses on chunk-level concerns: joining chunks, computing hashes etc.
// It doesn't know about S3, local disk, or metadata.

export interface ChunkInfo {
  index: number;
  buffer: Buffer;
}

export const concatChunks = (chunks: ChunkInfo[]): Buffer => {
  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  const buffers = sorted.map((c) => c.buffer);
  return Buffer.concat(buffers);
};

export const hashBufferSha256 = (buffer: Buffer): string =>
  crypto.createHash("sha256").update(buffer).digest("hex");

export const hashStreamSha256 = async (stream: Readable): Promise<{ checksum: string; sizeBytes: number }> => {
  const hash = crypto.createHash("sha256");
  let sizeBytes = 0;

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk) => {
      sizeBytes += chunk.length;
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });

  return {
    checksum: hash.digest("hex"),
    sizeBytes
  };
};

/**
 * Performance-critical: Uses C++ native addon with POSIX mmap() for zero-copy file hashing.
 */
export const hashFileNative = async (filePath: string, chunkSize: number = 1024 * 1024) => {
  const { nativeProcessFile } = await import("./native.wrapper");
  const chunks = nativeProcessFile(filePath, chunkSize);

  // The full file checksum would be a hash of the chunk hashes or similar convention
  // In this project, we return the chunks which contain the hashes.
  return {
    chunks,
    totalSize: chunks.reduce((acc, c) => acc + c.sizeBytes, 0)
  };
};


