import { ApplicationError } from "@/domain/errors/application-error";
import { env } from "@/lib/env";
import { S3CompatibleStorage } from "@/infrastructure/storage/s3-compatible-storage";
import { S3RestClient } from "@/infrastructure/storage/s3-rest-client";
import { LocalFileStorage } from "@/infrastructure/storage/local-storage";
import type { SignedUrlStorage, Storage } from "@/infrastructure/storage/storage";

let storage: Storage | undefined;

export function getStorage(): Storage {
  if (storage) return storage;

  if (env.STORAGE_PROVIDER === "local") {
    storage = new LocalFileStorage(env.STORAGE_ROOT, {
      maxObjectBytes: env.STORAGE_MAX_UPLOAD_BYTES,
      signingSecret: env.SESSION_SECRET,
      publicBaseUrl: env.NEXT_PUBLIC_APP_URL,
    });
    return storage;
  }

  if (!env.S3_BUCKET) {
    throw new ApplicationError("CONFLICT", "S3_BUCKET is required for S3 storage.", 409);
  }
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new ApplicationError(
      "CONFLICT",
      "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required for S3-compatible storage.",
      409,
    );
  }

  const client = new S3RestClient({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    sessionToken: env.S3_SESSION_TOKEN,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
  storage = new S3CompatibleStorage(client, { maxObjectBytes: env.STORAGE_MAX_UPLOAD_BYTES });
  return storage;
}

export function getSignedStorage(): Storage & SignedUrlStorage {
  const candidate = getStorage();
  if (!isSignedUrlStorage(candidate)) {
    throw new ApplicationError(
      "CONFLICT",
      "The configured storage provider cannot sign URLs.",
      409,
    );
  }
  return candidate;
}

export function setStorageForTests(nextStorage: Storage): void {
  storage = nextStorage;
}

export function resetStorageForTests(): void {
  storage = undefined;
}

function isSignedUrlStorage(value: Storage): value is Storage & SignedUrlStorage {
  return (
    typeof (value as Partial<SignedUrlStorage>).createSignedDownloadUrl === "function" &&
    typeof (value as Partial<SignedUrlStorage>).createSignedUploadUrl === "function"
  );
}
