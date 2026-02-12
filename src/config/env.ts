import dotenv from "dotenv";

// Load environment variables as early as possible.
dotenv.config();

type NodeEnv = "development" | "test" | "production";

interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  // Database
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  // Redis
  redis: {
    url: string;
  };
  // S3 / Local storage
  storage: {
    driver: "s3" | "local";
    s3: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      bucket: string;
    };
    local: {
      basePath: string;
    };
  };
  // JWT
  jwt: {
    accessSecret: string;
    accessExpiry: string;
    refreshSecret: string;
    refreshExpiry: string;
  };
  logLevel: string;
  // Cluster / replication
  cluster: {
    enabled: boolean;
    nodeId: string;
    replicationFactor: number;
    peers: string[]; // other node base URLs
  };
  // File URL signing
  fileLinks: {
    signingSecret: string;
    defaultExpirySeconds: number;
  };
}

const required = (value: string | undefined, key: string): string => {
  if (!value) {
    // In a real backend we'd fail fast instead of silently defaulting.
    // For a college project this helps surface misconfig early.
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const toInt = (value: string | undefined, key: string, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer for env var ${key}: "${value}"`);
  }
  return parsed;
};

const nodeEnv = (process.env.NODE_ENV as NodeEnv) || "development";

export const config: AppConfig = {
  nodeEnv,
  port: toInt(process.env.PORT, "PORT", 4000),
  db: {
    host: required(process.env.DB_HOST, "DB_HOST"),
    port: toInt(process.env.DB_PORT, "DB_PORT", 5432),
    name: required(process.env.DB_NAME, "DB_NAME"),
    user: required(process.env.DB_USER, "DB_USER"),
    password: required(process.env.DB_PASSWORD, "DB_PASSWORD")
  },
  redis: {
    url: required(process.env.REDIS_URL, "REDIS_URL")
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER as "s3" | "local") || "local",
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      region: process.env.AWS_REGION || "us-east-1",
      bucket: process.env.AWS_S3_BUCKET || ""
    },
    local: {
      // For local development we can just drop files under ./data/uploads
      basePath: process.env.LOCAL_STORAGE_PATH || "./data/uploads"
    }
  },
  jwt: {
    accessSecret: required(process.env.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET"),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshSecret: required(process.env.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET"),
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d"
  },
  logLevel: process.env.LOG_LEVEL || "info",
  cluster: {
    enabled: process.env.CLUSTER_ENABLED === "true",
    nodeId: process.env.NODE_ID || `node-${Math.random().toString(36).slice(2, 8)}`,
    replicationFactor: toInt(process.env.REPLICATION_FACTOR, "REPLICATION_FACTOR", 2),
    peers: process.env.CLUSTER_PEERS ? process.env.CLUSTER_PEERS.split(",").map((p) => p.trim()).filter(Boolean) : []
  },
  fileLinks: {
    signingSecret: required(process.env.FILE_URL_SIGNING_SECRET, "FILE_URL_SIGNING_SECRET"),
    defaultExpirySeconds: toInt(process.env.FILE_URL_EXPIRY_SECONDS, "FILE_URL_EXPIRY_SECONDS", 900)
  }
};

