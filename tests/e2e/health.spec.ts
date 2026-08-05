import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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

test("Phase 2 curriculum, grade, subject, and management explorers are usable", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.goto("/curricula");
  await expect(
    page.getByRole("heading", { name: "Choose the lens for your learning." }),
  ).toBeVisible();
  await expect(page.getByText("Kosovo Curriculum")).toBeVisible();
  await page
    .getByRole("link", { name: /Kosovo Curriculum/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/curricula\/curriculum-kosovo$/);
  await expect(page.getByRole("heading", { name: "Kosovo Curriculum" })).toBeVisible();

  await page.getByRole("link", { name: /Grade 6/ }).click();
  await expect(page).toHaveURL(/\/grades\/grade-6\?curriculumId=curriculum-kosovo$/);
  await expect(page.getByRole("heading", { name: "Grade 6" })).toBeVisible();
  await expect(page.getByText("Mathematics").first()).toBeVisible();

  await page.goto("/subjects?curriculumId=curriculum-kosovo");
  await expect(page.getByRole("heading", { name: "Five ways into science." })).toBeVisible();
  await page
    .getByRole("link", { name: /Mathematics/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/subjects\/subject-mathematics\?curriculumId=curriculum-kosovo$/);
  await expect(page.getByRole("heading", { name: "Mathematics" })).toBeVisible();

  await page.goto("/curricula/manage");
  await expect(page.getByRole("heading", { name: "Curriculum management" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create curriculum" })).toBeVisible();
  const createCurriculumForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create curriculum" }) })
    .first();
  await createCurriculumForm.locator("#curriculum-name").fill("E2E Custom Structure");
  await createCurriculumForm.locator("#curriculum-slug").fill("e2e-custom-structure");
  await createCurriculumForm
    .locator("#curriculum-description")
    .fill("A structure created through the Phase 2 management flow.");
  await createCurriculumForm.getByRole("button", { name: "Create curriculum" }).click();
  await expect(createCurriculumForm.getByRole("status")).toContainText("Curriculum saved.");

  await page.goto("/grades/manage");
  await expect(page.getByRole("heading", { name: "Grade management" })).toBeVisible();
  await page.goto("/subjects/manage");
  await expect(page.getByRole("heading", { name: "Subject management" })).toBeVisible();
  await page.goto("/domains/manage");
  await expect(page.getByRole("heading", { name: "Domain management" })).toBeVisible();
});

test("Phase 3 course catalog, lesson reader, progress, and authoring surfaces are usable", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/courses");
  await expect(
    page.getByRole("heading", { name: "A course is a path, not a pile." }),
  ).toBeVisible();
  await expect(page.getByText("Motion in One Dimension")).toBeVisible();
  await page.getByRole("link", { name: /Motion in One Dimension/ }).click();
  await expect(page).toHaveURL(/\/courses\/course-physics-motion$/);
  await expect(page.getByRole("heading", { name: "Motion in One Dimension" })).toBeVisible();
  await expect(page.getByText("The language of motion")).toBeVisible();

  await page.getByRole("link", { name: /Describing motion/ }).click();
  await expect(page).toHaveURL(/\/lessons\/lesson-describing-motion$/);
  await expect(page.getByRole("heading", { name: "Describing motion" })).toBeVisible();
  await expect(page.locator('[role="math"]')).toBeVisible();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await expect(page.getByRole("status")).toContainText("Progress saved.");

  await page.goto("/courses/manage");
  await expect(page.getByRole("heading", { name: "Course studio" })).toBeVisible();
  await page.goto("/lessons/lesson-speed-and-velocity/edit");
  await expect(page.getByRole("heading", { name: "Speed and velocity" })).toBeVisible();
  await expect(page.getByLabel("Payload JSON").first()).toBeVisible();
  await page.goto("/lessons/lesson-describing-motion/versions");
  await expect(page.getByRole("heading", { name: "Describing motion" })).toBeVisible();
});
