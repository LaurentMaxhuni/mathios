import { ConflictError } from "@/domain/errors/application-error";
import { normalizeStorageKey, validateUpload } from "@/domain/storage/rules";
import { STORAGE_DEFAULT_MAX_UPLOAD_BYTES } from "@/domain/storage/types";
import type {
  HealthCheckableStorage,
  PutObjectInput,
  SignedUploadUrl,
  SignedUrlOptions,
  SignedUrlStorage,
  Storage,
  StorageHealth,
  StoredObject,
} from "@/infrastructure/storage/storage";

export interface S3LikeClient {
  putObject(input: { key: string; body: Uint8Array; contentType?: string }): Promise<void>;
  getObject(key: string): Promise<{ body: Uint8Array; contentType?: string } | null>;
  headObject(key: string): Promise<{ size: number } | null>;
  deleteObject(key: string): Promise<void>;
  presignGetObject?(input: { key: string; expiresInSeconds: number }): Promise<string>;
  presignPutObject?(input: {
    key: string;
    expiresInSeconds: number;
    contentType?: string;
  }): Promise<string>;
}

export interface S3CompatibleStorageOptions {
  maxObjectBytes?: number;
}

/** Provider-neutral adapter. The concrete S3-compatible client is composed by the infrastructure root. */
export class S3CompatibleStorage implements Storage, SignedUrlStorage, HealthCheckableStorage {
  private readonly maxObjectBytes: number;

  constructor(
    private readonly client: S3LikeClient,
    options: S3CompatibleStorageOptions = {},
  ) {
    this.maxObjectBytes = options.maxObjectBytes ?? STORAGE_DEFAULT_MAX_UPLOAD_BYTES;
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const validated = validateUpload({ ...input, maxBytes: this.maxObjectBytes });
    await this.client.putObject({
      key: validated.key,
      body: validated.body,
      contentType: validated.contentType,
    });
    return {
      key: validated.key,
      body: validated.body,
      contentType: validated.contentType,
      size: validated.size,
    };
  }

  async get(key: string): Promise<StoredObject | null> {
    const normalizedKey = normalizeStorageKey(key);
    const result = await this.client.getObject(normalizedKey);
    if (!result) return null;
    return {
      key: normalizedKey,
      body: result.body,
      contentType: result.contentType,
      size: result.body.byteLength,
    };
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.headObject(normalizeStorageKey(key))) !== null;
  }

  async delete(key: string): Promise<void> {
    await this.client.deleteObject(normalizeStorageKey(key));
  }

  async checkHealth(): Promise<StorageHealth> {
    try {
      await this.client.headObject(".mathios/readiness");
      return { provider: "s3", status: "ok" };
    } catch (error) {
      return {
        provider: "s3",
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createSignedDownloadUrl(options: SignedUrlOptions): Promise<string> {
    if (!this.client.presignGetObject) {
      throw new ConflictError("The configured S3 provider does not support signed download URLs.");
    }
    return this.client.presignGetObject({
      key: normalizeStorageKey(options.key),
      expiresInSeconds: normalizeTtl(options.expiresInSeconds),
    });
  }

  async createSignedUploadUrl(options: SignedUrlOptions): Promise<SignedUploadUrl> {
    if (!this.client.presignPutObject) {
      throw new ConflictError("The configured S3 provider does not support signed upload URLs.");
    }
    const expiresInSeconds = normalizeTtl(options.expiresInSeconds);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    return {
      url: await this.client.presignPutObject({
        key: normalizeStorageKey(options.key),
        expiresInSeconds,
        contentType: options.contentType,
      }),
      method: "PUT",
      headers: options.contentType ? { "Content-Type": options.contentType } : undefined,
      expiresAt: expiresAt.toISOString(),
    };
  }
}

function normalizeTtl(value: number): number {
  return Math.max(60, Math.min(86_400, Math.trunc(value)));
}
