import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "mathios_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(profileId: string, secret: string, now = Date.now()): string {
  const payload = encode(`${profileId}.${now}`);
  return `${payload}.${signature(payload, secret)}`;
}

export function readSessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): { profileId: string; issuedAt: number } | null {
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return null;
  const expectedSignature = signature(payload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(receivedSignature);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return null;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const separator = decoded.lastIndexOf(".");
  if (separator <= 0) return null;
  const profileId = decoded.slice(0, separator);
  const issuedAt = Number(decoded.slice(separator + 1));
  if (!profileId || !Number.isSafeInteger(issuedAt)) return null;
  const ageSeconds = (now - issuedAt) / 1000;
  if (ageSeconds < -300 || ageSeconds > SESSION_MAX_AGE_SECONDS) return null;
  return { profileId, issuedAt };
}
