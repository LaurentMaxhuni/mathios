import type { Config } from "drizzle-kit";

export default {
  schema: "./src/infrastructure/database/schema/postgres.ts",
  out: "./drizzle/generated",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://neondb_owner:neon-development-only@localhost:5432/neondb",
  },
} satisfies Config;
