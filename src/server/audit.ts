import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { getDatabase } from "@/infrastructure/database/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface AuditEventInput {
  actorProfileId?: string | null;
  eventType: string;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRecord extends AuditEventInput {
  id: string;
  createdAt: string;
}

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const values = [
    randomUUID(),
    input.actorProfileId ?? null,
    clamp(input.eventType, 120),
    clamp(input.resourceType, 120),
    clamp(input.resourceId, 160),
    clamp(input.ipAddress, 128),
    clamp(input.userAgent, 512),
    JSON.stringify(input.metadata ?? {}).slice(0, 16_384),
  ];

  try {
    const database = getDatabase();
    if (database.provider === "sqlite") {
      database.raw
        .prepare(
          `INSERT INTO audit_logs (id, actor_profile_id, event_type, resource_type, resource_id, ip_address, user_agent, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(...values);
    } else {
      await database.raw.unsafe(
        `INSERT INTO audit_logs (id, actor_profile_id, event_type, resource_type, resource_id, ip_address, user_agent, metadata_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        values,
      );
    }
  } catch (error) {
    logger.warn("Audit event could not be persisted", {
      eventType: input.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordRequestAuditEvent(
  input: Omit<AuditEventInput, "ipAddress" | "userAgent">,
): Promise<void> {
  try {
    const requestHeaders = await headers();
    await recordAuditEvent({
      ...input,
      ipAddress: getClientAddress(requestHeaders),
      userAgent: requestHeaders.get("user-agent"),
    });
  } catch {
    await recordAuditEvent(input);
  }
}

export async function listRecentAuditEvents(limit = 50): Promise<readonly AuditLogRecord[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  try {
    const database = getDatabase();
    const rows =
      database.provider === "sqlite"
        ? (database.raw
            .prepare(
              `SELECT id, actor_profile_id, event_type, resource_type, resource_id, ip_address, user_agent, metadata_json, created_at
               FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?`,
            )
            .all(safeLimit) as AuditDbRow[])
        : await database.raw<AuditDbRow[]>`
            SELECT id, actor_profile_id, event_type, resource_type, resource_id, ip_address, user_agent, metadata_json, created_at
            FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ${safeLimit}
          `;
    return rows.map(mapAuditRow);
  } catch (error) {
    logger.warn("Audit events could not be read", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

interface AuditDbRow {
  id: string;
  actor_profile_id: string | null;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: string;
  created_at: Date | string;
}

function mapAuditRow(row: AuditDbRow): AuditLogRecord {
  let metadata: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(row.metadata_json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      metadata = parsed as Record<string, unknown>;
    }
  } catch {
    // Keep malformed legacy metadata hidden from the UI.
  }
  return {
    id: row.id,
    actorProfileId: row.actor_profile_id,
    eventType: row.event_type,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function clamp(value: string | null | undefined, maxLength: number): string | null {
  return value ? value.slice(0, maxLength) : null;
}

function getClientAddress(requestHeaders: Headers): string | null {
  if (env.TRUST_PROXY) {
    return (
      requestHeaders.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
      requestHeaders.get("x-real-ip")
    );
  }
  return requestHeaders.get("x-real-ip");
}
