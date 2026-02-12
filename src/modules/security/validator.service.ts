// Small collection of validation utilities for security-sensitive checks.

const SAFE_FILE_NAME_REGEX = /^[a-zA-Z0-9._\- ]+$/;

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_MIME_EXACT = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain"
];

export const isSafeFileName = (name: string): boolean => {
  if (!name || name.length > 255) return false;
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false;
  return SAFE_FILE_NAME_REGEX.test(name);
};

export const isAllowedMimeType = (mimeType: string): boolean => {
  if (!mimeType) return false;
  if (ALLOWED_MIME_EXACT.includes(mimeType)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
};

export const validateUploadFile = (opts: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  maxSizeBytes?: number;
}): { valid: boolean; message?: string } => {
  const maxSize = opts.maxSizeBytes ?? 100 * 1024 * 1024; // 100MB default

  if (!isSafeFileName(opts.originalName)) {
    return { valid: false, message: "File name contains unsafe characters or patterns" };
  }

  if (!isAllowedMimeType(opts.mimeType)) {
    return { valid: false, message: `Unsupported file type: ${opts.mimeType}` };
  }

  if (opts.sizeBytes <= 0) {
    return { valid: false, message: "File appears to be empty" };
  }

  if (opts.sizeBytes > maxSize) {
    return { valid: false, message: `File is too large (max ${(maxSize / (1024 * 1024)).toFixed(0)}MB)` };
  }

  return { valid: true };
};

