import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runSeed } from "@/infrastructure/database/seed";
import { SqlIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { hashSecret } from "@/features/auth/secret";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as sqliteSchema from "@/infrastructure/database/schema/sqlite";

async function createRepository() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-identity-"));
  const databaseUrl = `file:${path.join(directory, "test.db")}`;
  await runSeed({ provider: "sqlite", databaseUrl });
  const raw = new Database(path.join(directory, "test.db"));
  raw.pragma("foreign_keys = ON");
  const repository = new SqlIdentityRepository({
    provider: "sqlite",
    raw,
    db: drizzle(raw, { schema: sqliteSchema }),
  });
  return { directory, raw, repository };
}

describe("SqlIdentityRepository", () => {
  it("creates a profile with settings, roles, and permissions", async () => {
    const { directory, raw, repository } = await createRepository();
    try {
      const profile = await repository.createProfile({
        id: "11111111-1111-4111-8111-111111111111",
        userId: "22222222-2222-4222-8222-222222222222",
        identifier: "local-first",
        authMode: "local-profile",
        displayName: "Ada",
        avatar: "atom",
        preferredTheme: "dark",
        preferredLanguage: "en",
        currentCurriculum: null,
        currentGrade: null,
        targetGrade: null,
        secretHash: hashSecret("1234"),
        roles: ["learner", "administrator"],
      });

      expect(profile.displayName).toBe("Ada");
      expect(profile.secretHash).toMatch(/^scrypt\$/);
      const principal = await repository.getPrincipalByProfileId(profile.id);
      expect(principal?.roles).toEqual(["administrator", "learner"]);
      expect(principal?.permissions).toContain("manage_users");
      expect(await repository.getSettings(profile.id)).toMatchObject({
        theme: "dark",
        studySessionDuration: 25,
      });
    } finally {
      raw.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("round-trips settings and onboarding arrays without losing local state", async () => {
    const { directory, raw, repository } = await createRepository();
    try {
      const profile = await repository.createProfile({
        id: "33333333-3333-4333-8333-333333333333",
        userId: "44444444-4444-4444-8444-444444444444",
        identifier: "local-round-trip",
        authMode: "local-profile",
        displayName: "Mina",
        avatar: "leaf",
        preferredTheme: "system",
        preferredLanguage: "sq",
        currentCurriculum: null,
        currentGrade: null,
        targetGrade: null,
        secretHash: null,
        roles: ["learner"],
      });
      await repository.saveSettings({
        profileId: profile.id,
        theme: "light",
        reducedMotion: true,
        textSize: "large",
        defaultGrade: "Grade 8",
        defaultCurriculum: "Custom",
        preferredSubjects: ["physics", "astronomy"],
        studySessionDuration: 45,
        weekStartDay: 0,
        formulaRendering: "plain",
        accessibilityPreferences: {
          highContrast: true,
          underlineLinks: true,
          focusIndicators: true,
          screenReaderOptimizations: false,
        },
      });
      const now = new Date().toISOString();
      await repository.saveOnboarding({
        profileId: profile.id,
        curriculum: "Custom",
        currentGrade: "Grade 8",
        targetGrade: "Grade 10",
        subjects: ["physics"],
        learningGoals: ["Understand motion"],
        weeklyStudyTimeMinutes: 300,
        preferredStudyDays: [1, 3, 5],
        difficultyPreference: "challenging",
        skipped: false,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await expect(repository.getSettings(profile.id)).resolves.toMatchObject({
        reducedMotion: true,
        preferredSubjects: ["physics", "astronomy"],
        accessibilityPreferences: { highContrast: true, underlineLinks: true },
      });
      await expect(repository.getOnboarding(profile.id)).resolves.toMatchObject({
        subjects: ["physics"],
        preferredStudyDays: [1, 3, 5],
        difficultyPreference: "challenging",
      });
    } finally {
      raw.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
