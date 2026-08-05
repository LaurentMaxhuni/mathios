import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z
    .enum(["development", "test", "local-production", "docker", "hosted-production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_PROVIDER: z.enum(["sqlite", "postgres"]).default("sqlite"),
  DATABASE_URL: z.string().min(1).default("file:./data/mathios.db"),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_ROOT: z.string().min(1).default("./data/storage"),
  AUTH_MODE: z.enum(["local-profile", "local-credential", "hosted"]).default("local-profile"),
  SEARCH_PROVIDER: z.enum(["local", "remote"]).default("local"),
  AI_PROVIDER: z.enum(["disabled", "local", "remote", "hybrid"]).default("disabled"),
  SESSION_SECRET: z.string().min(32).default("change-me-in-development-only-change-me"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, string | undefined>): AppEnv {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}

export const env = parseEnv(process.env);
