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

export interface Storage {
  put(input: PutObjectInput): Promise<StoredObject>;
  get(key: string): Promise<StoredObject | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
