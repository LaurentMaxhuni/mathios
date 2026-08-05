import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ValidationError } from "@/domain/errors/application-error";
import type { PutObjectInput, Storage, StoredObject } from "@/infrastructure/storage/storage";

export class LocalFileStorage implements Storage {
  private readonly rootDirectory: string;

  constructor(rootDirectory: string) {
    this.rootDirectory = path.resolve(rootDirectory);
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const filePath = this.resolveKey(input.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const body = Buffer.from(input.body);
    await writeFile(filePath, body);

    return {
      key: input.key,
      body,
      contentType: input.contentType,
      size: body.byteLength,
    };
  }

  async get(key: string): Promise<StoredObject | null> {
    const filePath = this.resolveKey(key);

    try {
      const [body, fileStats] = await Promise.all([readFile(filePath), stat(filePath)]);
      return { key, body, size: fileStats.size };
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolveKey(key);
    try {
      await stat(filePath);
      return true;
    } catch (error) {
      if (isMissingFile(error)) return false;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    await rm(filePath, { force: true });
  }

  private resolveKey(key: string): string {
    const normalizedKey = key.trim();
    if (!normalizedKey || path.isAbsolute(normalizedKey)) {
      throw new ValidationError("Storage keys must be non-empty relative paths.");
    }

    const candidate = path.resolve(this.rootDirectory, normalizedKey);
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
