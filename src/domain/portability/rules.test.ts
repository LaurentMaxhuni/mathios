import { describe, expect, it } from "vitest";
import {
  isBackupDue,
  normalizeBackupSettings,
  planRestore,
  tableNamesForKind,
  validatePortablePackage,
} from "@/domain/portability/rules";
import type { PortablePackage } from "@/domain/portability/types";

const packageFixture: PortablePackage = {
  manifest: {
    magic: "mathios-portable",
    formatVersion: 1,
    phase: 15,
    kind: "settings",
    createdAt: "2026-08-06T00:00:00.000Z",
    databaseProvider: "sqlite",
    tableCount: 1,
    rowCount: 1,
    fileCount: 0,
    includedTables: ["backup_settings"],
    checksum: "fixture",
  },
  tables: [
    {
      name: "backup_settings",
      columns: ["id", "enabled"],
      primaryKey: ["id"],
      rows: [{ id: 1, enabled: true }],
    },
  ],
  files: [],
};

describe("portability domain rules", () => {
  it("keeps scopes explicit and validates safe package structure", () => {
    expect(tableNamesForKind("content")).toContain("lesson_assets");
    expect(tableNamesForKind("user-data")).toContain("notes");
    expect(() => validatePortablePackage(packageFixture)).not.toThrow();
    expect(() =>
      validatePortablePackage({
        ...packageFixture,
        tables: [{ ...packageFixture.tables[0], name: "unknown_table" }],
      }),
    ).toThrow(/unknown/);
  });

  it("plans merge and replace without changing source data", () => {
    const current = [
      {
        ...packageFixture.tables[0],
        rows: [
          { id: 1, enabled: false },
          { id: 2, enabled: true },
        ],
      },
    ];
    const merge = planRestore(packageFixture, current, "merge");
    const replace = planRestore(packageFixture, current, "replace");
    expect(merge.conflicts).toHaveLength(1);
    expect(merge.totalInserts).toBe(0);
    expect(merge.totalUpdates).toBe(0);
    expect(replace.totalUpdates).toBe(1);
    expect(replace.totalInserts).toBe(0);
  });

  it("normalizes schedules and detects due backups", () => {
    const settings = normalizeBackupSettings({
      enabled: true,
      schedule: "daily",
      lastRunAt: "2026-08-05T00:00:00.000Z",
    });
    expect(isBackupDue(settings, new Date("2026-08-06T00:00:00.000Z"))).toBe(true);
    expect(isBackupDue({ ...settings, enabled: false }, new Date("2026-08-06T00:00:00.000Z"))).toBe(
      false,
    );
    expect(() => normalizeBackupSettings({ location: "../outside" })).toThrow(/relative/);
  });
});
