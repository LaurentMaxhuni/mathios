import { runMigrations } from "@/infrastructure/database/migrations";

async function main(): Promise<void> {
  const result = await runMigrations();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
