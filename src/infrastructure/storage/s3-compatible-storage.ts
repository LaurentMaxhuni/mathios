import type { PutObjectInput, Storage, StoredObject } from "@/infrastructure/storage/storage";

export interface S3LikeClient {
  putObject(input: { key: string; body: Uint8Array; contentType?: string }): Promise<void>;
  getObject(key: string): Promise<{ body: Uint8Array; contentType?: string } | null>;
  headObject(key: string): Promise<{ size: number } | null>;
  deleteObject(key: string): Promise<void>;
}

/** Provider-neutral adapter. An SDK-specific client is injected by the deployment composition root. */
export class S3CompatibleStorage implements Storage {
  constructor(private readonly client: S3LikeClient) {}

  async put(input: PutObjectInput): Promise<StoredObject> {
    const body = Buffer.from(input.body);
    await this.client.putObject({ key: input.key, body, contentType: input.contentType });
    return { key: input.key, body, contentType: input.contentType, size: body.byteLength };
  }

  async get(key: string): Promise<StoredObject | null> {
    const result = await this.client.getObject(key);
    if (!result) return null;
    return {
      key,
      body: result.body,
      contentType: result.contentType,
      size: result.body.byteLength,
    };
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.headObject(key)) !== null;
  }

  async delete(key: string): Promise<void> {
    await this.client.deleteObject(key);
  }
}
