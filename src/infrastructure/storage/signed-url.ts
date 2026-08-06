import { createHmac, timingSafeEqual } from "node:crypto";

export type LocalSignedOperation = "get" | "put";

function payload(operation: LocalSignedOperation, key: string, expiresAt: number): string {
  return `${operation}\n${key}\n${expiresAt}`;
}

export function createLocalStorageSignature(
  operation: LocalSignedOperation,
  key: string,
  expiresAt: number,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(payload(operation, key, expiresAt))
    .digest("base64url");
}

export function verifyLocalStorageSignature(
  operation: LocalSignedOperation,
  key: string,
  expiresAt: number,
  signature: string,
  secret: string,
  now = Date.now(),
): boolean {
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  const expected = Buffer.from(createLocalStorageSignature(operation, key, expiresAt, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
