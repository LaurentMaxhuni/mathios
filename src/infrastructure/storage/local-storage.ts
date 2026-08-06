import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ConflictError, ValidationError } from "@/domain/errors/application-error";
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
import { createLocalStorageSignature } from "@/infrastructure/storage/signed-url";

export interface LocalFileStorageOptions {
  maxObjectBytes?: number;
  signingSecret?: string;
  publicBaseUrl?: string;
}

export class LocalFileStorage implements Storage, SignedUrlStorage, HealthCheckableStorage {
  private readonly rootDirectory: string;
  private readonly maxObjectBytes: number;
  private readonly signingSecret?: string;
  private readonly publicBaseUrl?: string;

  constructor(rootDirectory: string, options: LocalFileStorageOptions = {}) {
    this.rootDirectory = path.resolve(rootDirectory);
    this.maxObjectBytes = options.maxObjectBytes ?? STORAGE_DEFAULT_MAX_UPLOAD_BYTES;
    this.signingSecret = options.signingSecret;
    this.publicBaseUrl = options.publicBaseUrl;
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const validated = validateUpload({ ...input, maxBytes: this.maxObjectBytes });
    const filePath = this.resolveKey(validated.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, validated.body, { flag: "wx" });
      await rename(temporaryPath, filePath);
    } finally {
      await rm(temporaryPath, { force: true });
    }

    return {
      key: validated.key,
      body: validated.body,
      contentType: validated.contentType,
      size: validated.size,
    };
  }

  async get(key: string): Promise<StoredObject | null> {
    const normalizedKey = normalizeStorageKey(key);
    const filePath = this.resolveKey(normalizedKey);

    try {
      const [body, fileStats] = await Promise.all([readFile(filePath), stat(filePath)]);
      return { key: normalizedKey, body, size: fileStats.size };
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolveKey(normalizeStorageKey(key));
    try {
      await stat(filePath);
      return true;
    } catch (error) {
      if (isMissingFile(error)) return false;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(normalizeStorageKey(key));
    await rm(filePath, { force: true });
  }

  async checkHealth(): Promise<StorageHealth> {
    try {
      await mkdir(this.rootDirectory, { recursive: true });
      await stat(this.rootDirectory);
      return { provider: "local", status: "ok" };
    } catch (error) {
      return {
        provider: "local",
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createSignedDownloadUrl(options: SignedUrlOptions): Promise<string> {
    const { key, expiresAt, signature } = this.sign("get", options);
    const url = this.createPublicUrl("/api/storage/download");
    url.searchParams.set("key", key);
    url.searchParams.set("expires", String(expiresAt));
    url.searchParams.set("signature", signature);
    return url.toString();
  }

  async createSignedUploadUrl(options: SignedUrlOptions): Promise<SignedUploadUrl> {
    const { key, expiresAt, signature } = this.sign("put", options);
    const url = this.createPublicUrl("/api/storage/upload");
    url.searchParams.set("key", key);
    url.searchParams.set("expires", String(expiresAt));
    url.searchParams.set("signature", signature);
    return {
      url: url.toString(),
      method: "PUT",
      headers: options.contentType ? { "Content-Type": options.contentType } : undefined,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  private sign(operation: "get" | "put", options: SignedUrlOptions) {
    if (!this.signingSecret || !this.publicBaseUrl) {
      throw new ConflictError(
        "Local signed URLs require a signing secret and public application URL.",
      );
    }
    const key = normalizeStorageKey(options.key);
    const ttl = Math.max(60, Math.min(86_400, Math.trunc(options.expiresInSeconds)));
    const expiresAt = Date.now() + ttl * 1000;
    return {
      key,
      expiresAt,
      signature: createLocalStorageSignature(operation, key, expiresAt, this.signingSecret),
    };
  }

  private createPublicUrl(route: string): URL {
    try {
      return new URL(route, this.publicBaseUrl);
    } catch {
      throw new ValidationError("The configured public application URL is invalid.");
    }
  }

  private resolveKey(key: string): string {
    const normalizedKey = key.trim().replaceAll("\\", "/");
    if (
      !normalizedKey ||
      path.isAbsolute(normalizedKey) ||
      normalizedKey.split("/").some((segment) => segment === "..")
    ) {
      throw new ValidationError("Storage keys may not escape the configured storage directory.");
    }

    const safeKey = normalizeStorageKey(normalizedKey);
    const candidate = path.resolve(this.rootDirectory, safeKey);
    const relativePath = path.relative(this.rootDirectory, candidate);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new ValidationError("Storage keys may not escape the configured storage directory.");
    }

    return candidate;
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
