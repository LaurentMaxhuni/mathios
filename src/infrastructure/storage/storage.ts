export interface PutObjectInput {
  key: string;
  body: Uint8Array | string;
  contentType?: string;
}

export interface StoredObject {
  key: string;
  body: Uint8Array;
  contentType?: string;
  size: number;
}

export interface SignedUrlOptions {
  key: string;
  expiresInSeconds: number;
  contentType?: string;
  maxBytes?: number;
}

export interface SignedUploadUrl {
  url: string;
  method: "PUT";
  headers?: Readonly<Record<string, string>>;
  expiresAt: string;
}

export interface SignedUrlStorage {
  createSignedDownloadUrl(options: SignedUrlOptions): Promise<string>;
  createSignedUploadUrl(options: SignedUrlOptions): Promise<SignedUploadUrl>;
}

export interface StorageHealth {
  provider: "local" | "s3";
  status: "ok" | "error";
  message?: string;
}

export interface HealthCheckableStorage {
  checkHealth(): Promise<StorageHealth>;
}

export interface Storage {
  put(input: PutObjectInput): Promise<StoredObject>;
  get(key: string): Promise<StoredObject | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
