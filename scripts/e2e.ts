import http from "node:http";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { runSeed } from "@/infrastructure/database/seed";

const baseUrl = "http://127.0.0.1:3000";

async function main(): Promise<void> {
  const databaseDirectory = await mkdtemp(path.join(os.tmpdir(), "mathios-e2e-"));
  const databaseUrl = `file:${path.join(databaseDirectory, "e2e.db")}`;
  await runSeed({ provider: "sqlite", databaseUrl });
  const serverPath = path.resolve(".next/standalone/server.js");
  const server = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: "3000",
      APP_ENV: "test",
      DATABASE_PROVIDER: "sqlite",
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: "mathios-e2e-session-secret-please-change",
    },
    stdio: "inherit",
  });

  try {
    await waitForServer(server);
    const playwrightCli = path.resolve("node_modules/@playwright/test/cli.js");
    const result = await runChild(process.execPath, [playwrightCli, "test"], { stdio: "inherit" });
    process.exitCode = result;
  } finally {
    if (!server.killed) server.kill();
    if (server.exitCode === null) {
      await new Promise<void>((resolve) => server.once("close", () => resolve()));
    }
    await rm(databaseDirectory, { recursive: true, force: true });
  }
}

async function waitForServer(server: ReturnType<typeof spawn>): Promise<void> {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (server.exitCode !== null)
      throw new Error(`Standalone server exited before becoming ready (code ${server.exitCode}).`);
    if (await isServerReady()) return;
    await delay(100);
  }

  throw new Error("Timed out waiting for the standalone server.");
}

function isServerReady(): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(`${baseUrl}/api/health`, (response) => {
      response.resume();
      resolve((response.statusCode ?? 500) < 500);
    });
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

function runChild(command: string, args: string[], options: { stdio: "inherit" }): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
