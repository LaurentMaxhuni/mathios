import { runSeed } from "@/infrastructure/database/seed";

async function main(): Promise<void> {
  await runSeed();
  console.log("Mathios foundation seed applied.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
