import { ValidationError } from "@/domain/errors/application-error";
import {
  STORAGE_ALLOWED_CONTENT_TYPES,
  STORAGE_DEFAULT_MAX_UPLOAD_BYTES,
  type UploadValidationInput,
  type ValidatedUpload,
} from "@/domain/storage/types";

const safeKeyPattern = /^[A-Za-z0-9._/@-]+$/;

export function normalizeStorageKey(value: string): string {
  const normalized = value.trim().replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("//") ||
    normalized
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..") ||
    !safeKeyPattern.test(normalized)
  ) {
    throw new ValidationError(
      "Storage keys must be safe, non-empty relative paths and may not escape their root.",
    );
  }
  return normalized;
}

export function validateUpload(input: UploadValidationInput): ValidatedUpload {
  const key = normalizeStorageKey(input.key);
  const body = typeof input.body === "string" ? new TextEncoder().encode(input.body) : input.body;
  const maxBytes = input.maxBytes ?? STORAGE_DEFAULT_MAX_UPLOAD_BYTES;
  if (!Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new ValidationError("The configured upload limit is invalid.");
  }
  if (body.byteLength > maxBytes) {
    throw new ValidationError(`The upload exceeds the ${maxBytes} byte limit.`);
  }

  const contentType = input.contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType && !isAllowedContentType(contentType)) {
    throw new ValidationError(`Uploads of type '${contentType}' are not allowed.`);
  }
  scanUpload(body, contentType);

  return { key, body, contentType, size: body.byteLength };
}

export function isAllowedContentType(value: string): boolean {
  return (STORAGE_ALLOWED_CONTENT_TYPES as readonly string[]).includes(value);
}

function scanUpload(body: Uint8Array, contentType: string | undefined): void {
  if (
    contentType === "application/zip" &&
    !hasAnyPrefix(body, [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ])
  ) {
    throw new ValidationError("The ZIP upload signature is invalid.");
  }
  if (contentType === "application/pdf" && !hasAsciiPrefix(body, "%PDF-")) {
    throw new ValidationError("The PDF upload signature is invalid.");
  }
  if (
    contentType === "image/png" &&
    !hasAnyPrefix(body, [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]])
  ) {
    throw new ValidationError("The PNG upload signature is invalid.");
  }
  if (contentType === "image/jpeg" && !hasAnyPrefix(body, [[0xff, 0xd8, 0xff]])) {
    throw new ValidationError("The JPEG upload signature is invalid.");
  }
  if (
    contentType === "image/gif" &&
    !hasAnyPrefix(body, [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    ])
  ) {
    throw new ValidationError("The GIF upload signature is invalid.");
  }
  if (
    contentType === "image/webp" &&
    (!hasAsciiPrefix(body, "RIFF") || !hasAsciiPrefix(body.slice(8), "WEBP"))
  ) {
    throw new ValidationError("The WebP upload signature is invalid.");
  }

  if (contentType?.startsWith("text/") || contentType === "application/json") {
    const sample = new TextDecoder().decode(body.slice(0, Math.min(body.byteLength, 4096)));
    if (sample.includes("\u0000"))
      throw new ValidationError("The text upload contains binary data.");
  }
}

function hasAsciiPrefix(body: Uint8Array, value: string): boolean {
  return new TextDecoder().decode(body.slice(0, value.length)) === value;
}

function hasAnyPrefix(body: Uint8Array, prefixes: readonly (readonly number[])[]): boolean {
  return prefixes.some((prefix) => prefix.every((value, index) => body[index] === value));
}
