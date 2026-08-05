import Database from "better-sqlite3";
import postgres from "postgres";
import { env } from "@/lib/env";
import { resolveSqliteFilename } from "@/infrastructure/database/client";
import { runMigrations } from "@/infrastructure/database/migrations";

const foundationSeed = [
  ["installation_name", "Mathios local installation"],
  ["seed_version", "phase-1"],
] as const;

export const roleSeed = [
  [
    "role-learner",
    "learner",
    "Learner",
    "Can access learning content and personal learning settings.",
  ],
  [
    "role-teacher",
    "teacher",
    "Teacher",
    "Can create and publish learning content and view analytics.",
  ],
  [
    "role-content-creator",
    "content-creator",
    "Content creator",
    "Can author and publish learning content.",
  ],
  [
    "role-administrator",
    "administrator",
    "Administrator",
    "Can manage profiles, application settings, and all local capabilities.",
  ],
] as const;

export const permissionSeed = [
  ["permission-view-learning-content", "view_learning_content", "View learning content"],
  ["permission-edit-content", "edit_content", "Edit content"],
  ["permission-publish-content", "publish_content", "Publish content"],
  ["permission-manage-users", "manage_users", "Manage users and roles"],
  ["permission-view-analytics", "view_analytics", "View analytics"],
  [
    "permission-manage-application-settings",
    "manage_application_settings",
    "Manage application settings",
  ],
  ["permission-run-backups", "run_backups", "Run backups"],
  ["permission-restore-backups", "restore_backups", "Restore backups"],
] as const;

export const rolePermissionSeed = {
  learner: ["view_learning_content"],
  teacher: ["view_learning_content", "edit_content", "publish_content", "view_analytics"],
  "content-creator": ["view_learning_content", "edit_content", "publish_content"],
  administrator: permissionSeed.map(([, slug]) => slug),
} as const;

export async function runSeed(
  options: { provider?: "sqlite" | "postgres"; databaseUrl?: string } = {},
): Promise<void> {
  const provider = options.provider ?? env.DATABASE_PROVIDER;
  const databaseUrl = options.databaseUrl ?? env.DATABASE_URL;
  await runMigrations({ provider, databaseUrl });

  if (provider === "sqlite") {
    const database = new Database(resolveSqliteFilename(databaseUrl));
    try {
      const statement = database.prepare(`
        INSERT INTO app_metadata (key, value, updated_at)
        VALUES (@key, @value, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);
      const insert = database.transaction(() => {
        for (const [key, value] of foundationSeed) statement.run({ key, value });
      });
      insert();

      const insertRole = database.prepare(`
        INSERT INTO roles (id, slug, name, description, is_system)
        VALUES (@id, @slug, @name, @description, 1)
        ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = CURRENT_TIMESTAMP
      `);
      const insertPermission = database.prepare(`
        INSERT INTO permissions (id, slug, name, description)
        VALUES (@id, @slug, @name, @description)
        ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = CURRENT_TIMESTAMP
      `);
      const insertRolePermission = database.prepare(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        SELECT roles.id, permissions.id
        FROM roles, permissions
        WHERE roles.slug = @roleSlug AND permissions.slug = @permissionSlug
      `);
      const insertCatalog = database.transaction(() => {
        for (const [id, slug, name, description] of roleSeed) {
          insertRole.run({ id, slug, name, description });
        }
        for (const [id, slug, name] of permissionSeed) {
          insertPermission.run({ id, slug, name, description: name });
        }
        for (const [roleSlug, permissions] of Object.entries(rolePermissionSeed)) {
          for (const permissionSlug of permissions) {
            insertRolePermission.run({ roleSlug, permissionSlug });
          }
        }
      });
      insertCatalog();
    } finally {
      database.close();
    }
    return;
  }

  const database = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  try {
    await database.begin(async (transaction) => {
      for (const [key, value] of foundationSeed) {
        await transaction`
          INSERT INTO app_metadata (key, value, updated_at)
          VALUES (${key}, ${value}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `;
      }
      for (const [id, slug, name, description] of roleSeed) {
        await transaction`
          INSERT INTO roles (id, slug, name, description, is_system)
          VALUES (${id}, ${slug}, ${name}, ${description}, TRUE)
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()
        `;
      }
      for (const [id, slug, name] of permissionSeed) {
        await transaction`
          INSERT INTO permissions (id, slug, name, description)
          VALUES (${id}, ${slug}, ${name}, ${name})
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()
        `;
      }
      for (const [roleSlug, permissions] of Object.entries(rolePermissionSeed)) {
        for (const permissionSlug of permissions) {
          await transaction`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT roles.id, permissions.id
            FROM roles, permissions
            WHERE roles.slug = ${roleSlug} AND permissions.slug = ${permissionSlug}
            ON CONFLICT DO NOTHING
          `;
        }
      }
    });
  } finally {
    await database.end({ timeout: 5 });
  }
}
