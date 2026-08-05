import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_ALGORITHM = "scrypt";
const KEY_LENGTH = 64;

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, KEY_LENGTH).toString("hex");
  return `${HASH_ALGORITHM}$${salt}$${hash}`;
}

export function verifySecret(secret: string, storedHash: string): boolean {
  const [algorithm, salt, encodedHash] = storedHash.split("$");
  if (algorithm !== HASH_ALGORITHM || !salt || !encodedHash) return false;
  try {
    const expected = Buffer.from(encodedHash, "hex");
    const actual = scryptSync(secret, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
