export const STORAGE_DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const STORAGE_ALLOWED_CONTENT_TYPES = [
  "application/json",
  "application/octet-stream",
  "application/pdf",
  "application/zip",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
] as const;

export type StorageContentType = (typeof STORAGE_ALLOWED_CONTENT_TYPES)[number];

export interface UploadValidationInput {
  key: string;
  body: Uint8Array | string;
  contentType?: string;
  maxBytes?: number;
}

export interface ValidatedUpload {
  key: string;
  body: Uint8Array;
  contentType?: string;
  size: number;
}
