import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import { config } from "./env";

// This module intentionally stays low-level. Higher-level storage logic (upload/download)
// should live in a storage service, not inside the config layer.

export type StorageDriver = "s3" | "local";

export interface StorageConfig {
  driver: StorageDriver;
  s3?: AWS.S3;
  localBasePath?: string;
}

let storageConfig: StorageConfig;

const ensureLocalPath = (basePath: string): void => {
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }
};

export const initStorage = (): StorageConfig => {
  if (storageConfig) return storageConfig;

  if (config.storage.driver === "s3") {
    AWS.config.update({
      accessKeyId: config.storage.s3.accessKeyId,
      secretAccessKey: config.storage.s3.secretAccessKey,
      region: config.storage.s3.region
    });

    const s3 = new AWS.S3();
    storageConfig = {
      driver: "s3",
      s3
    };
  } else {
    const basePath = path.resolve(config.storage.local.basePath);
    ensureLocalPath(basePath);

    storageConfig = {
      driver: "local",
      localBasePath: basePath
    };
  }

  return storageConfig;
};

export const getStorageConfig = (): StorageConfig => {
  if (!storageConfig) {
    storageConfig = initStorage();
  }
  return storageConfig;
};

