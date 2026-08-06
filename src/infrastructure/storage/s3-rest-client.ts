import { createHash, createHmac } from "node:crypto";
import type { S3LikeClient } from "@/infrastructure/storage/s3-compatible-storage";

export interface S3RestClientOptions {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  forcePathStyle?: boolean;
  fetchImplementation?: typeof fetch;
}

interface SignedRequest {
  url: string;
  headers: Headers;
}

/** Minimal AWS Signature V4 client for AWS S3 and S3-compatible providers such as MinIO/R2. */
export class S3RestClient implements S3LikeClient {
  private readonly endpoint: URL;
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: S3RestClientOptions) {
    this.endpoint = new URL(options.endpoint ?? `https://s3.${options.region}.amazonaws.com`);
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async putObject(input: { key: string; body: Uint8Array; contentType?: string }): Promise<void> {
    const request = this.signRequest("PUT", input.key, {
      contentType: input.contentType,
      payloadHash: sha256(input.body),
    });
    const response = await this.fetchImplementation(request.url, {
      method: "PUT",
      headers: request.headers,
      body: input.body as BodyInit,
    });
    await this.assertSuccessful(response, "uploading an object");
  }

  async getObject(key: string): Promise<{ body: Uint8Array; contentType?: string } | null> {
    const request = this.signRequest("GET", key, { payloadHash: sha256(new Uint8Array()) });
    const response = await this.fetchImplementation(request.url, {
      method: "GET",
      headers: request.headers,
    });
    if (response.status === 404) return null;
    await this.assertSuccessful(response, "reading an object");
    return {
      body: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? undefined,
    };
  }

  async headObject(key: string): Promise<{ size: number } | null> {
    const request = this.signRequest("HEAD", key, { payloadHash: sha256(new Uint8Array()) });
    const response = await this.fetchImplementation(request.url, {
      method: "HEAD",
      headers: request.headers,
    });
    if (response.status === 404) return null;
    await this.assertSuccessful(response, "checking an object");
    return { size: Number(response.headers.get("content-length") ?? 0) };
  }

  async deleteObject(key: string): Promise<void> {
    const request = this.signRequest("DELETE", key, { payloadHash: sha256(new Uint8Array()) });
    const response = await this.fetchImplementation(request.url, {
      method: "DELETE",
      headers: request.headers,
    });
    if (response.status === 404) return;
    await this.assertSuccessful(response, "deleting an object");
  }

  async presignGetObject(input: { key: string; expiresInSeconds: number }): Promise<string> {
    return this.presign("GET", input.key, input.expiresInSeconds);
  }

  async presignPutObject(input: {
    key: string;
    expiresInSeconds: number;
    contentType?: string;
  }): Promise<string> {
    return this.presign("PUT", input.key, input.expiresInSeconds, input.contentType);
  }

  private signRequest(
    method: string,
    key: string,
    options: { contentType?: string; payloadHash: string },
  ): SignedRequest {
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const date = amzDate.slice(0, 8);
    const url = this.objectUrl(key);
    const host = url.host;
    const headers = new Headers({
      host,
      "x-amz-content-sha256": options.payloadHash,
      "x-amz-date": amzDate,
    });
    if (options.contentType) headers.set("content-type", options.contentType);
    if (this.options.sessionToken) headers.set("x-amz-security-token", this.options.sessionToken);

    const signedHeaders = [...headers.keys()]
      .map((name) => name.toLowerCase())
      .sort()
      .join(";");
    const canonicalHeaders = [...headers.keys()]
      .map((name) => name.toLowerCase())
      .sort()
      .map((name) => `${name}:${normalizeHeader(headers.get(name) ?? "")}\n`)
      .join("");
    const canonicalRequest = [
      method,
      url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      options.payloadHash,
    ].join("\n");
    const credentialScope = `${date}/${this.options.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join("\n");
    const signature = hmacHex(
      signingKey(this.options.secretAccessKey, date, this.options.region, "s3"),
      stringToSign,
    );
    headers.set(
      "authorization",
      `AWS4-HMAC-SHA256 Credential=${this.options.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    );
    return { url: url.toString(), headers };
  }

  private presign(
    method: "GET" | "PUT",
    key: string,
    expiresInSeconds: number,
    contentType?: string,
  ): string {
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const date = amzDate.slice(0, 8);
    const url = this.objectUrl(key);
    const credentialScope = `${date}/${this.options.region}/s3/aws4_request`;
    const signedHeaders = contentType ? "content-type;host" : "host";
    const query = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${this.options.accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(Math.max(60, Math.min(86_400, Math.trunc(expiresInSeconds)))),
      "X-Amz-SignedHeaders": signedHeaders,
    });
    if (this.options.sessionToken) query.set("X-Amz-Security-Token", this.options.sessionToken);
    const canonicalQuery = [...query.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
      .join("&");
    const canonicalRequest = [
      method,
      url.pathname,
      canonicalQuery,
      contentType
        ? `content-type:${normalizeHeader(contentType)}\nhost:${url.host}\n`
        : `host:${url.host}\n`,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join("\n");
    query.set(
      "X-Amz-Signature",
      hmacHex(
        signingKey(this.options.secretAccessKey, date, this.options.region, "s3"),
        stringToSign,
      ),
    );
    url.search = query.toString();
    return url.toString();
  }

  private objectUrl(key: string): URL {
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const url = new URL(this.endpoint.toString());
    if (this.options.forcePathStyle) {
      url.pathname = `${url.pathname.replace(/\/$/, "")}/${encodeURIComponent(this.options.bucket)}/${encodedKey}`;
    } else {
      url.hostname = `${this.options.bucket}.${url.hostname}`;
      url.pathname = `${url.pathname.replace(/\/$/, "")}/${encodedKey}`;
    }
    return url;
  }

  private async assertSuccessful(response: Response, operation: string): Promise<void> {
    if (response.ok) return;
    const body = await response.text().catch(() => "");
    throw new Error(
      `S3 provider failed while ${operation} (${response.status}): ${body.slice(0, 256)}`,
    );
  }
}

function formatAmzDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmacHex(key: Uint8Array | string, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function signingKey(secret: string, date: string, region: string, service: string): Buffer {
  const dateKey = createHmac("sha256", `AWS4${secret}`).update(date).digest();
  const regionKey = createHmac("sha256", dateKey).update(region).digest();
  const serviceKey = createHmac("sha256", regionKey).update(service).digest();
  return createHmac("sha256", serviceKey).update("aws4_request").digest();
}
