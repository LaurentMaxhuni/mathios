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
