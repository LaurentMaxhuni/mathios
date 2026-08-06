import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const PREFIX = "MATHIOS16E1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer {
  return createHash("sha256").update(env.SESSION_SECRET).digest();
}

function encode(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function encryptAiSecret(secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [PREFIX, encode(iv), encode(cipher.getAuthTag()), encode(ciphertext)].join(".");
}

export function decryptAiSecret(value: string | null): string | null {
  if (!value) return null;
  const [prefix, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (prefix !== PREFIX || !ivValue || !tagValue || !ciphertextValue) return null;
  try {
    const iv = decode(ivValue);
    const tag = decode(tagValue);
    const ciphertext = decode(ciphertextValue);
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
