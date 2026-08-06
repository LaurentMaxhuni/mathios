import { createHmac, timingSafeEqual, verify as verifySignature } from "node:crypto";

export interface HostedJwtClaims {
  sub: string;
  iss?: string;
  aud?: string | readonly string[];
  exp: number;
  nbf?: number;
  [key: string]: unknown;
}

export interface HostedJwtVerificationConfig {
  sharedSecret?: string;
  publicKey?: string;
  issuer?: string;
  audience?: string;
}

export function verifyHostedJwt(
  token: string,
  config: HostedJwtVerificationConfig,
  now = Date.now(),
): HostedJwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const header = parseJson<{ alg?: string }>(parts[0]);
  const claims = parseJson<HostedJwtClaims>(parts[1]);
  if (!header || !claims || !claims.sub || !Number.isFinite(claims.exp)) return null;
  if (claims.exp * 1000 <= now || (claims.nbf !== undefined && claims.nbf * 1000 > now + 30_000)) {
    return null;
  }
  if (config.issuer && claims.iss !== config.issuer) return null;
  if (config.audience && !audienceIncludes(claims.aud, config.audience)) return null;

  const signedContent = `${parts[0]}.${parts[1]}`;
  const received = decodeBase64Url(parts[2]);
  if (!received) return null;

  if (header.alg === "HS256" && config.sharedSecret) {
    const expected = createHmac("sha256", config.sharedSecret).update(signedContent).digest();
    return expected.length === received.length && timingSafeEqual(expected, received)
      ? claims
      : null;
  }
  if (header.alg === "RS256" && config.publicKey) {
    const publicKey = config.publicKey.replaceAll("\\n", "\n");
    return verifySignature("RSA-SHA256", Buffer.from(signedContent), publicKey, received)
      ? claims
      : null;
  }
  return null;
}

function parseJson<T>(value: string): T | null {
  try {
    const decoded = decodeBase64Url(value);
    return decoded ? (JSON.parse(decoded.toString("utf8")) as T) : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

function audienceIncludes(audience: HostedJwtClaims["aud"], expected: string): boolean {
  return typeof audience === "string"
    ? audience === expected
    : Array.isArray(audience) && audience.includes(expected);
}
