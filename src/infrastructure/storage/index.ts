import { ApplicationError } from "@/domain/errors/application-error";
import { env } from "@/lib/env";
import { LocalFileStorage } from "@/infrastructure/storage/local-storage";
import type { Storage } from "@/infrastructure/storage/storage";

let storage: Storage | undefined;

export function getStorage(): Storage {
  if (storage) return storage;

  if (env.STORAGE_PROVIDER === "local") {
    storage = new LocalFileStorage(env.STORAGE_ROOT);
    return storage;
  }

  throw new ApplicationError(
    "CONFLICT",
    "S3 storage is configured but no provider client is composed.",
    409,
  );
}

export function setStorageForTests(nextStorage: Storage): void {
  storage = nextStorage;
}
