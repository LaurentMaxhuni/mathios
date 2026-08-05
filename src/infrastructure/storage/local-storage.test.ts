import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalFileStorage } from "@/infrastructure/storage/local-storage";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("LocalFileStorage", () => {
  it("stores and retrieves nested objects", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-storage-"));
    temporaryDirectories.push(directory);
    const storage = new LocalFileStorage(directory);

    await storage.put({ key: "lessons/example.txt", body: "hello", contentType: "text/plain" });

    expect(await storage.exists("lessons/example.txt")).toBe(true);
    await expect(storage.get("lessons/example.txt")).resolves.toMatchObject({
      key: "lessons/example.txt",
      size: 5,
    });
  });

  it("rejects path traversal", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-storage-"));
    temporaryDirectories.push(directory);
    const storage = new LocalFileStorage(directory);

    await expect(storage.put({ key: "../outside.txt", body: "blocked" })).rejects.toThrow(/escape/);
  });
});
