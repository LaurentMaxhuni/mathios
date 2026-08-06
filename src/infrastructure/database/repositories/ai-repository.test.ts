import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { getAiRepository } from "@/infrastructure/database/repositories/ai-repository";

describe("AI repository", () => {
  it("persists sanitized settings and profile-scoped generated content", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-ai-"));
    const databaseUrl = "file:" + path.join(directory, "ai.db");
    let database: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "ai.db"));
      database.pragma("foreign_keys = ON");
      database
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-ai", "ai-user");
      database
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-ai", "user-ai", "AI learner");
      const handle = {
        provider: "sqlite",
        raw: database,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = getAiRepository(handle);

      expect((await repository.getSettings()).mode).toBe("disabled");
      await repository.updateSettings({
        mode: "remote",
        localBaseUrl: "http://127.0.0.1:11434",
        localModel: "local",
        remoteBaseUrl: "https://api.example.test/v1",
        remoteModel: "remote",
        remoteApiKeyCiphertext: "encrypted-ciphertext",
        maxTokens: 256,
        temperature: 0.3,
      });
      const view = await repository.getSettingsView();
      expect(view).toMatchObject({ mode: "remote", hasRemoteApiKey: true });
      expect(view).not.toHaveProperty("remoteApiKeyCiphertext");

      const generation = await repository.createGeneration({
        id: "generation-ai",
        profileId: "profile-ai",
        task: "simpler-explanation",
        mode: "remote",
        provider: "remote",
        model: "remote",
        instruction: "Explain acceleration.",
        grounding: [
          {
            type: "official",
            label: "Published lesson",
            content: "Reference text.",
            approved: true,
          },
        ],
        output: "AI-generated explanation.",
        status: "generated",
      });
      expect(generation).toMatchObject({
        id: "generation-ai",
        profileId: "profile-ai",
        status: "generated",
      });
      await expect(
        repository.reviewGeneration("generation-ai", "approved", "profile-ai"),
      ).resolves.toMatchObject({ status: "approved", reviewedByProfileId: "profile-ai" });
      await expect(repository.listGenerations("profile-ai")).resolves.toHaveLength(1);
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
