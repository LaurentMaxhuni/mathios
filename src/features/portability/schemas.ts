import { z } from "zod";
import {
  BACKUP_SCHEDULES,
  BACKUP_TYPES,
  EXPORT_FORMATS,
  RESTORE_MODES,
} from "@/domain/portability/types";

export const exportRequestSchema = z.object({
  kind: z.enum(BACKUP_TYPES),
  format: z.enum(EXPORT_FORMATS),
});

export const backupRequestSchema = z.object({
  kind: z.enum(BACKUP_TYPES).optional(),
});

export const restoreOptionsSchema = z.object({
  mode: z.enum(RESTORE_MODES).default("merge"),
  preview: z.boolean().default(false),
});

export const backupSettingsSchema = z.object({
  enabled: z.boolean(),
  schedule: z.enum(BACKUP_SCHEDULES),
  backupType: z.enum(BACKUP_TYPES),
  retentionCount: z.number().int().min(1).max(100),
  location: z.string().min(1).max(120),
  encryptionEnabled: z.boolean(),
});
