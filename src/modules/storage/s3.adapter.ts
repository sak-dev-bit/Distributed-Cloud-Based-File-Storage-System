import AWS from "aws-sdk";
import crypto from "crypto";
import { Readable } from "stream";
import { getStorageConfig } from "../../config/s3";

// Thin wrapper around S3 for uploads and downloads.
// This module focuses on S3-specific details (multipart, retries, etc.)
// and deliberately avoids mixing in business logic.

const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface UploadResult {
  storageKey: string;
  sizeBytes: number;
  checksum: string;
}

export const uploadBuffer = async (params: {
  key: string;
  buffer: Buffer;
  mimeType?: string;
  expectedChecksum?: string;
}): Promise<UploadResult> => {
  const { s3 } = getStorageConfig();
  if (!s3) {
    throw new Error("S3 client not configured");
  }

  const checksum = crypto.createHash("sha256").update(params.buffer).digest("hex");
  if (params.expectedChecksum && params.expectedChecksum !== checksum) {
    const err = new Error("Checksum mismatch before upload");
    (err as any).statusCode = 400;
    throw err;
  }

  const body = params.buffer;
  let attempt = 0;
  while (true) {
    try {
      await s3
        .putObject({
          Bucket: getBucketName(),
          Key: params.key,
          Body: body,
          ContentType: params.mimeType
        })
        .promise();

      return {
        storageKey: params.key,
        sizeBytes: body.length,
        checksum
      };
    } catch (err) {
      attempt += 1;
      if (attempt > MAX_RETRIES) {
        throw err;
      }
      // Basic backoff: 200ms, 400ms, 800ms
      await sleep(200 * attempt);
    }
  }
};

export const uploadStreamMultipart = async (params: {
  key: string;
  stream: Readable;
  mimeType?: string;
}): Promise<UploadResult> => {
  const { s3 } = getStorageConfig();
  if (!s3) {
    throw new Error("S3 client not configured");
  }

  const bucket = getBucketName();
  const checksumHash = crypto.createHash("sha256");

  const upload = new AWS.S3.ManagedUpload({
    service: s3,
    params: {
      Bucket: bucket,
      Key: params.key,
      Body: params.stream,
      ContentType: params.mimeType
    },
    partSize: 5 * 1024 * 1024, // 5MB
    queueSize: 4
  });

  let sizeBytes = 0;
  params.stream.on("data", (chunk) => {
    sizeBytes += chunk.length;
    checksumHash.update(chunk);
  });

  await upload.promise();

  const checksum = checksumHash.digest("hex");

  return {
    storageKey: params.key,
    sizeBytes,
    checksum
  };
};

export const getObjectStream = (key: string): AWS.Request<AWS.S3.GetObjectOutput, AWS.AWSError> => {
  const { s3 } = getStorageConfig();
  if (!s3) {
    throw new Error("S3 client not configured");
  }

  return s3.getObject({
    Bucket: getBucketName(),
    Key: key
  });
};

const getBucketName = (): string => {
  const cfg = getStorageConfig();
  if (!cfg.s3) {
    throw new Error("S3 client not configured");
  }
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET env var is required for S3 storage");
  }
  return bucket;
};

