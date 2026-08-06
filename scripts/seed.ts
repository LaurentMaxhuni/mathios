import "./load-env";
import { runSeed } from "@/infrastructure/database/seed";

async function main(): Promise<void> {
  await runSeed();
  console.log("Mathios Phase 1 identity seed applied.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
