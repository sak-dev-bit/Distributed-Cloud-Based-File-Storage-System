// Simple in-memory metrics store.
// This is intentionally lightweight: good enough for local dashboards and unit tests
// without dragging in heavy monitoring infrastructure.

export interface RequestMetrics {
  total: number;
  byRoute: Record<string, number>;
  avgLatencyMs: number;
}

export interface ErrorMetrics {
  total: number;
  byStatus: Record<string, number>;
}

export interface TransferMetrics {
  uploadBytes: number;
  downloadBytes: number;
}

export interface StorageMetrics {
  // We treat this as an approximate counter for now; for strict accounting
  // you'd scan the metadata tables instead.
  logicalBytesStored: number;
}

export interface MetricsSnapshot {
  requests: RequestMetrics;
  errors: ErrorMetrics;
  transfer: TransferMetrics;
  storage: StorageMetrics;
  process: {
    uptimeSec: number;
    memoryRssBytes: number;
  };
}

let requestCount = 0;
const routeCounts: Record<string, number> = {};
let totalLatencyMs = 0;

let errorCount = 0;
const errorByStatus: Record<string, number> = {};

let uploadBytes = 0;
let downloadBytes = 0;

let logicalBytesStored = 0;

export const recordRequest = (routeKey: string, latencyMs: number): void => {
  requestCount += 1;
  totalLatencyMs += latencyMs;
  routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
};

export const recordError = (statusCode: number): void => {
  errorCount += 1;
  const key = String(statusCode);
  errorByStatus[key] = (errorByStatus[key] || 0) + 1;
};

export const recordUploadBytes = (bytes: number): void => {
  if (bytes <= 0) return;
  uploadBytes += bytes;
  logicalBytesStored += bytes;
};

export const recordDownloadBytes = (bytes: number): void => {
  if (bytes <= 0) return;
  downloadBytes += bytes;
};

export const getMetricsSnapshot = (): MetricsSnapshot => {
  const avgLatencyMs = requestCount > 0 ? totalLatencyMs / requestCount : 0;
  const mem = process.memoryUsage();

  return {
    requests: {
      total: requestCount,
      byRoute: { ...routeCounts },
      avgLatencyMs
    },
    errors: {
      total: errorCount,
      byStatus: { ...errorByStatus }
    },
    transfer: {
      uploadBytes,
      downloadBytes
    },
    storage: {
      logicalBytesStored
    },
    process: {
      uptimeSec: process.uptime(),
      memoryRssBytes: mem.rss
    }
  };
};

