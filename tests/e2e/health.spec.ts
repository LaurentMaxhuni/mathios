import { expect, test } from "@playwright/test";

test("foundation overview renders and exposes a healthy endpoint", async ({ page, request }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A sturdy place to build curious minds." }),
  ).toBeVisible();
  await expect(page.getByText("Database foundation")).toBeVisible();

  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    checks: { database: "ok" },
  });
});

test("local profile setup, PIN sign-in, and settings are usable offline", async ({ page }) => {
  await page.goto("/profiles/new");
  await page.getByLabel("Display name").fill("E2E Learner");
  await page.getByLabel("Optional PIN or password").fill("1234");
  await page.getByLabel("Confirm PIN or password").fill("1234");
  await page.getByRole("button", { name: "Create profile" }).click();

  await expect(page).toHaveURL(/\/auth\/sign-in\?profileId=/);
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Welcome back, E2E Learner." })).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Default curriculum").fill("Local curriculum");
  await page.getByLabel("Default grade or level").fill("Grade 8");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Settings saved.");

  await page.goto("/settings/roles");
  await expect(page.getByRole("heading", { name: "Role management" })).toBeVisible();
  await expect(page.getByText("Administrator").first()).toBeVisible();
});
