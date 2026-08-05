import type { Config } from "drizzle-kit";

export default {
  schema: "./src/infrastructure/database/schema/sqlite.ts",
  out: "./drizzle/generated",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/mathios.db",
  },
} satisfies Config;
