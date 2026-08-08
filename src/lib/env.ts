import { z } from "zod";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true" || value === "1") return true;
  if (value.toLowerCase() === "false" || value === "0") return false;
  return value;
}, z.boolean());
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z
    .enum(["development", "test", "local-production", "docker", "hosted-production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_PROVIDER: z.enum(["sqlite", "postgres"]).default("postgres"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://neondb_owner:neon-development-only@localhost:5432/neondb"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_CONNECT_TIMEOUT_SECONDS: z.coerce.number().int().min(1).max(120).default(10),
  DATABASE_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().min(0).max(3600).default(20),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_ROOT: z.string().min(1).default("./data/storage"),
  STORAGE_MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(1_073_741_824)
    .default(25 * 1024 * 1024),
  STORAGE_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  S3_ENDPOINT: optionalUrl,
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_SESSION_TOKEN: optionalString,
  S3_FORCE_PATH_STYLE: booleanEnv.default(false),
  AUTH_MODE: z
    .enum(["neon-auth", "local-profile", "local-credential", "hosted"])
    .default("neon-auth"),
  COLLABORATION_ENABLED: booleanEnv.default(false),
  NEON_AUTH_BASE_URL: optionalUrl,
  NEON_AUTH_COOKIE_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  HOSTED_AUTH_ISSUER: optionalUrl,
  HOSTED_AUTH_AUDIENCE: optionalString,
  HOSTED_AUTH_SHARED_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  HOSTED_AUTH_PUBLIC_KEY: optionalString,
  SEARCH_PROVIDER: z.enum(["local", "remote"]).default("local"),
  AI_PROVIDER: z.enum(["disabled", "local", "remote", "hybrid"]).default("disabled"),
  AI_LOCAL_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  AI_LOCAL_MODEL: z.string().min(1).default("llama3.2"),
  AI_REMOTE_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_REMOTE_MODEL: z.string().min(1).default("gpt-4o-mini"),
  AI_REMOTE_API_KEY: optionalString,
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(15000),
  SESSION_SECRET: z.string().min(32).default("change-me-in-development-only-change-me"),
  SESSION_ROTATION_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .min(300)
    .max(SESSION_MAX_AGE_SECONDS)
    .default(60 * 60 * 24),
  RATE_LIMIT_ENABLED: booleanEnv.default(true),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(100_000).default(300),
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3600).default(900),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(1000).default(10),
  CSRF_PROTECTION_ENABLED: booleanEnv.default(true),
  TRUST_PROXY: booleanEnv.default(false),
  ERROR_TRACKING_DSN: optionalUrl,
  METRICS_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(16).optional(),
  ),
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

  const configuration = result.data;
  const issues: string[] = [];
  const isHostedProduction = configuration.APP_ENV === "hosted-production";
  const isPlaceholderSecret = configuration.SESSION_SECRET.includes("change-me");

  if (
    configuration.DATABASE_PROVIDER === "postgres" &&
    configuration.DATABASE_URL.startsWith("file:")
  ) {
    issues.push("DATABASE_URL must be a PostgreSQL URL when DATABASE_PROVIDER=postgres");
  }
  if (configuration.STORAGE_PROVIDER === "s3" && !configuration.S3_BUCKET) {
    issues.push("S3_BUCKET is required when STORAGE_PROVIDER=s3");
  }
  if (
    configuration.AUTH_MODE === "hosted" &&
    !configuration.HOSTED_AUTH_SHARED_SECRET &&
    !configuration.HOSTED_AUTH_PUBLIC_KEY
  ) {
    issues.push(
      "HOSTED_AUTH_SHARED_SECRET or HOSTED_AUTH_PUBLIC_KEY is required when AUTH_MODE=hosted",
    );
  }
  if (isHostedProduction && configuration.AUTH_MODE === "neon-auth") {
    if (!configuration.NEON_AUTH_BASE_URL) {
      issues.push("NEON_AUTH_BASE_URL is required when AUTH_MODE=neon-auth");
    }
    if (!configuration.NEON_AUTH_COOKIE_SECRET) {
      issues.push("NEON_AUTH_COOKIE_SECRET is required when AUTH_MODE=neon-auth");
    }
  }
  if (isHostedProduction) {
    if (configuration.DATABASE_PROVIDER !== "postgres") {
      issues.push("APP_ENV=hosted-production requires DATABASE_PROVIDER=postgres");
    }
    if (configuration.STORAGE_PROVIDER !== "s3") {
      issues.push("APP_ENV=hosted-production requires STORAGE_PROVIDER=s3");
    }
    if (isPlaceholderSecret || configuration.SESSION_SECRET.length < 48) {
      issues.push(
        "APP_ENV=hosted-production requires a non-placeholder SESSION_SECRET of 48+ characters",
      );
    }
    try {
      const publicUrl = new URL(configuration.NEXT_PUBLIC_APP_URL);
      if (["localhost", "127.0.0.1", "::1"].includes(publicUrl.hostname)) {
        issues.push("APP_ENV=hosted-production requires a non-local NEXT_PUBLIC_APP_URL");
      }
    } catch {
      // The URL schema reports malformed URLs before this branch.
    }
  }

  if (issues.length > 0) {
    throw new Error(`Invalid environment configuration: ${issues.join("; ")}`);
  }

  return configuration;
}

export const env = parseEnv(process.env);
