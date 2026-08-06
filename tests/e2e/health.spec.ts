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

test("Phase 18 readiness, security headers, and metrics protection are exposed", async ({
  request,
}) => {
  const readiness = await request.get("/api/readiness");
  expect(readiness.status()).toBe(200);
  expect(readiness.headers()).toMatchObject({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  await expect(readiness.json()).resolves.toMatchObject({
    status: "ready",
    checks: {
      database: "ok",
      migrations: "ok",
      storage: "ok",
      configuration: "ok",
    },
    details: {
      databaseProvider: "sqlite",
      storageProvider: "local",
      latestMigration: "0018_phase18_deployment_hardening.sql",
    },
  });

  const metrics = await request.get("/api/metrics");
  expect(metrics.status()).toBe(401);
  await expect(metrics.json()).resolves.toMatchObject({ code: "UNAUTHORIZED" });
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
  await expect(page).toHaveURL("/");

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

test("Phase 4 concepts, prerequisite graph, and authoring surfaces are usable", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/concepts");
  await expect(
    page.getByRole("heading", { name: "Concepts that connect the curriculum." }),
  ).toBeVisible();
  await expect(page.getByText("Velocity").first()).toBeVisible();
  await page
    .getByRole("link", { name: /Velocity/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/concepts\/concept-velocity$/);
  await expect(page.getByRole("heading", { name: "Velocity" })).toBeVisible();
  await expect(page.getByText("Position").first()).toBeVisible();
  await expect(page.getByText("Describing motion").first()).toBeVisible();

  await page.goto("/knowledge-graph");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "The knowledge graph" })).toBeVisible();
  await expect(page.getByLabel("Search concepts")).toBeVisible();
  await page.getByLabel("Search concepts").pressSequentially("velocity");
  await expect(page.locator("p").filter({ hasText: "Showing" }).first()).toContainText(
    "Showing 1 concepts",
  );
  const graphResponse = await page.evaluate(async () => {
    const response = await fetch("/api/knowledge-graph");
    return { ok: response.ok, body: await response.json() };
  });
  expect(graphResponse.ok).toBeTruthy();
  expect(graphResponse.body).toMatchObject({
    graph: { nodes: expect.any(Array) },
  });

  await page.goto("/concepts/manage");
  await expect(page.getByRole("heading", { name: "Concept and graph studio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Graph validation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Relationship ledger" })).toBeVisible();
});

test("Phase 5 exercise player, validation APIs, and authoring surfaces are usable", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Practice that explains itself." })).toBeVisible();
  await expect(page.getByText("Motion practice lab")).toBeVisible();
  await page.getByRole("link", { name: /Start practice/ }).click();
  await expect(page).toHaveURL(/\/exercise-sets\/exercise-set-motion-practice$/);
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.locator('input[type="radio"][value="b"]').check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("status")).toContainText("Correct.");

  const validationResponse = await page.evaluate(async () => {
    const response = await fetch("/api/exercises/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "numeric-unit",
        answerSpec: { expected: 12, unit: "N" },
        response: "0.012 kN",
      }),
    });
    return { ok: response.ok, body: await response.json() };
  });
  expect(validationResponse.ok).toBeTruthy();
  expect(validationResponse.body).toMatchObject({ result: { status: "correct" } });

  await page.goto("/exercises/questions");
  await expect(page.getByRole("heading", { name: "Reusable question bank." })).toBeVisible();
  await expect(page.getByText("Equivalent algebraic expressions")).toBeVisible();
  await page.getByRole("link", { name: "Bulk import" }).click();
  await expect(page.getByRole("heading", { name: "Bulk import reusable questions" })).toBeVisible();
  await page.goto("/exercises/manage");
  await expect(page.getByRole("heading", { name: "Question and exercise studio." })).toBeVisible();
});

test("Phase 6 assessment catalog, timed workflow, and authoring surface are usable", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/assessments");
  await expect(
    page.getByRole("heading", { name: "Assessments that make readiness visible." }),
  ).toBeVisible();
  await expect(page.getByText("Motion module quiz")).toBeVisible();
  await expect(page.getByText("Motion readiness diagnostic")).toBeVisible();

  await page
    .getByRole("link", { name: /Open assessment/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/assessments\/assessment-motion-quiz$/);
  await expect(page.locator("h1").filter({ hasText: "Motion module quiz" })).toBeVisible();
  await page.getByRole("button", { name: "Start assessment" }).click();
  await expect(page.getByText("Question 1 of 4")).toBeVisible();

  for (let question = 1; question <= 4; question += 1) {
    await page
      .getByRole("button", { name: question === 4 ? "Submit assessment" : "Save answer" })
      .click();
    if (question < 4) await expect(page.getByText(`Question ${question + 1} of 4`)).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Assessment submitted" })).toBeVisible();
  await expect(page.getByText("Mistakes to review")).toBeVisible();

  await page.goto("/assessments/manage");
  await expect(page.getByRole("heading", { name: "Assessment studio." })).toBeVisible();
  await expect(page.getByText("Motion placement check")).toBeVisible();
});

test("Phase 7 mastery dashboard, explainable detail, recommendations, and review queue are usable", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/mastery");
  await expect(page.getByRole("heading", { name: "See what is sticking." })).toBeVisible();
  await expect(page.getByText("Concepts assessed")).toBeVisible();
  await expect(page.getByText("Mastery by subject")).toBeVisible();
  await expect(page.getByText("Mastery by grade range")).toBeVisible();

  await page.goto("/mastery/subjects");
  await expect(page.getByRole("heading", { name: "Subject mastery map" })).toBeVisible();
  await page.goto("/mastery/grades");
  await expect(page.getByRole("heading", { name: "Grade mastery view" })).toBeVisible();

  await page.goto("/mastery/concepts/concept-velocity");
  await expect(page.getByRole("heading", { name: "Velocity" })).toBeVisible();
  await expect(page.getByText("Explainable score")).toBeVisible();
  await expect(page.getByText("Evidence history")).toBeVisible();
  await expect(page.getByText("Prerequisite health")).toBeVisible();

  await page.goto("/recommendations");
  await expect(page.getByRole("heading", { name: "Recommendation feed" })).toBeVisible();
  await expect(page.getByText(/Every suggestion names the signal/)).toBeVisible();
  await page.goto("/review-queue");
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();

  const masteryResponse = await page.evaluate(async () => {
    const response = await fetch("/api/mastery");
    return { ok: response.ok, body: await response.json() };
  });
  expect(masteryResponse.ok).toBeTruthy();
  expect(masteryResponse.body).toMatchObject({
    dashboard: { concepts: expect.any(Array) },
    recommendations: expect.any(Array),
  });
});

test("Phase 8 roadmaps, prerequisite progress, personalized paths, and APIs are usable", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/roadmaps");
  await expect(page.getByRole("heading", { name: "Interdisciplinary roadmaps" })).toBeVisible();
  await expect(page.getByText("Mathematics and Physics Foundations")).toBeVisible();

  const catalogResponse = await page.evaluate(async () => {
    const response = await fetch("/api/roadmaps");
    return { ok: response.ok, body: await response.json() };
  });
  expect(catalogResponse.ok).toBeTruthy();
  expect(catalogResponse.body.roadmaps).toHaveLength(7);

  const roadmapLink = page.getByRole("link", {
    name: /published Mathematics and Physics Foundations/,
  });
  await expect(roadmapLink).toHaveAttribute("href", "/roadmaps/roadmap-math-physics-foundations");
  await page.goto("/roadmaps/roadmap-math-physics-foundations");
  await expect(page).toHaveURL(/\/roadmaps\/roadmap-math-physics-foundations$/);
  await expect(
    page.getByRole("heading", { name: "Mathematics and Physics Foundations" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start this roadmap" }).click();
  await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();

  const detailResponse = await page.evaluate(async () => {
    const response = await fetch("/api/roadmaps/roadmap-math-physics-foundations");
    return { ok: response.ok, body: await response.json() };
  });
  expect(detailResponse.ok).toBeTruthy();
  expect(detailResponse.body.detail).toMatchObject({
    roadmap: { id: "roadmap-math-physics-foundations" },
    integrity: { valid: true },
  });

  await page.getByRole("button", { name: "Mark complete" }).first().click();
  await expect(page.getByText("1/4")).toBeVisible();
  await page.getByRole("button", { name: "Generate personalized path" }).click();
  await expect(page.getByRole("link", { name: "Open full path" })).toBeVisible();

  const pathResponse = await page.evaluate(async () => {
    const response = await fetch("/api/roadmaps/roadmap-math-physics-foundations/path");
    return { ok: response.ok, body: await response.json() };
  });
  expect(pathResponse.ok).toBeTruthy();
  expect(pathResponse.body.path).toMatchObject({
    roadmapId: "roadmap-math-physics-foundations",
    pathNodes: expect.any(Array),
  });

  await page.goto("/personalized-paths");
  await expect(page.getByRole("heading", { name: "Personalized learning paths" })).toBeVisible();
  await expect(page.getByText("Why this order?")).toBeVisible();
  await expect(page.getByText("Describing motion")).toBeVisible();
});

test("Phase 9 simulation catalog, interactive player, lesson link, and session API are usable", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/simulations");
  await expect(page.getByRole("heading", { name: "Simulations" })).toBeVisible();
  await expect(page.getByText("One-dimensional motion")).toBeVisible();
  const catalogResponse = await page.evaluate(async () => {
    const response = await fetch("/api/simulations");
    return { ok: response.ok, body: await response.json() };
  });
  expect(catalogResponse.ok).toBeTruthy();
  expect(catalogResponse.body.simulations).toHaveLength(17);

  const simulationLink = page.locator('a[href="/simulations/simulation-one-dimensional-motion"]');
  await expect(simulationLink).toBeVisible();
  await simulationLink.click();
  await expect(page).toHaveURL(/\/simulations\/simulation-one-dimensional-motion$/);
  await expect(page.locator("h1").filter({ hasText: "One-dimensional motion" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore with a simulation" })).toHaveCount(0);
  await expect(page.getByLabel("Simulation controls")).toBeVisible();
  await expect(page.getByRole("img", { name: "Simulation graph" })).toBeVisible();
  await page.getByLabel("Acceleration").fill("2");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Complete" }).click();
  await expect(page.getByText("Result saved to your learning history.")).toBeVisible();

  await page.goto("/lessons/lesson-constant-acceleration");
  await expect(page.getByRole("heading", { name: "Explore with a simulation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "One-dimensional motion" })).toHaveAttribute(
    "href",
    "/simulations/simulation-one-dimensional-motion",
  );
});

test("Phase 10 laboratory workspace records data, analyzes it, and exports a report", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/laboratories");
  await expect(page.getByRole("heading", { name: "Virtual laboratory" })).toBeVisible();
  await expect(page.getByText("Determine acceleration from motion data")).toBeVisible();
  const catalogResponse = await page.evaluate(async () => {
    const response = await fetch("/api/laboratories");
    return { ok: response.ok, body: await response.json() };
  });
  expect(catalogResponse.ok).toBeTruthy();
  expect(catalogResponse.body.activities).toHaveLength(7);

  await page.getByRole("link", { name: /Determine acceleration from motion data/ }).click();
  await expect(
    page.getByRole("heading", { name: "Determine acceleration from motion data" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin experiment" }).click();
  await expect(page.getByRole("heading", { name: "Procedure and observations" })).toBeVisible();
  await page.getByRole("button", { name: "Import simulation data" }).click();
  await expect(page.getByText("Simulation data imported into the data table.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Laboratory data graph" })).toBeVisible();

  await page
    .getByLabel("Observation notes")
    .first()
    .fill("The track was level and the cart moved smoothly.");
  await page.getByLabel("Observation notes").first().blur();
  await page.getByLabel("Time, trial 1", { exact: true }).fill("1.2");
  await page.getByLabel("Time, trial 1", { exact: true }).blur();
  await page.getByRole("button", { name: "Complete experiment" }).click();
  await expect(
    page.getByText("Experiment completed. Your report can now be submitted."),
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Write up the experiment" })).toBeVisible();
  await page
    .getByLabel("Conclusion")
    .fill(
      "The measured motion data supports a constant-acceleration model, with timing uncertainty as the main limitation.",
    );
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible();
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByText("Report submitted for feedback.")).toBeVisible();
  await expect(page.getByRole("link", { name: "HTML export" })).toBeVisible();
  const htmlResponse = await page.evaluate(async () => {
    const href =
      document.querySelector('a[aria-label="HTML export"]')?.getAttribute("href") ??
      document.querySelector('a[href*="format=html"]')?.getAttribute("href");
    const response = await fetch(href ?? "");
    return {
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      body: await response.text(),
    };
  });
  expect(htmlResponse.ok).toBeTruthy();
  expect(htmlResponse.contentType).toContain("text/html");
  expect(htmlResponse.body).toContain("Determine acceleration from motion data report");
});

test("Phase 11 study planner generates a calendar rhythm and records completion", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/planner");
  await expect(
    page.getByRole("heading", { name: "Study with a shape, not a wish." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "New study goal" })).toBeVisible();
  await page.getByLabel("Target", { exact: true }).selectOption("roadmap-math-physics-foundations");
  await expect(page.getByLabel("Target", { exact: true })).toHaveValue(
    "roadmap-math-physics-foundations",
  );
  await page.getByLabel("Goal label").fill("E2E science rhythm");
  await page.getByRole("button", { name: "Generate my plan" }).click();
  await expect(page.getByRole("heading", { name: "E2E science rhythm" })).toBeVisible();

  const plannerResponse = await page.evaluate(async () => {
    const response = await fetch("/api/planner");
    return { ok: response.ok, body: await response.json() };
  });
  expect(plannerResponse.ok).toBeTruthy();
  expect(plannerResponse.body.dashboard.activePlan).toMatchObject({
    goal: { title: "E2E science rhythm" },
    sessions: expect.any(Array),
  });

  await page.getByRole("tab", { name: "agenda" }).click();
  await expect(page.getByRole("tab", { name: "agenda" })).toHaveAttribute("aria-selected", "true");
  const completeButton = page.getByRole("button", { name: "Done" }).first();
  await expect(completeButton).toBeVisible();
  await completeButton.click();
  await expect(page.getByText("Session complete", { exact: false })).toBeVisible();
  await expect(page.getByText(/1 of .* sessions complete/)).toBeVisible();
});

test("Phase 12 notes, captures, search, and personal map are usable", async ({ page }) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/notes");
  await expect(page.getByRole("heading", { name: "Personal knowledge base" })).toBeVisible();
  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Note title").fill("Energy review");
  await page
    .getByLabel("Note body (Markdown)")
    .fill("# Energy\n\nThe useful relationship is **v=u+at** and $E=mc^2$.");
  await page.getByLabel("Tags").fill("physics, review");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status")).toContainText("Note saved.");
  await expect(page.getByText("Energy review").first()).toBeVisible();

  await page.getByLabel("Resource id", { exact: true }).fill("lesson-constant-acceleration");
  await page.getByLabel("Resource label", { exact: true }).fill("Motion lesson");
  await page.getByRole("button", { name: "Add resource link" }).click();
  await expect(page.getByRole("status")).toContainText("Learning resource linked.");

  await page.getByLabel("Bookmark resource id").fill("lesson-constant-acceleration");
  await page.getByLabel("Bookmark title").fill("Motion lesson");
  await page.getByRole("button", { name: "Save bookmark" }).click();
  await expect(page.getByRole("status")).toContainText("Bookmark saved.");

  await page.getByLabel("Highlight source id").fill("lesson-constant-acceleration");
  await page.getByLabel("Highlighted text").fill("v=u+at");
  await page.getByRole("button", { name: "Save highlight" }).click();
  await expect(page.getByRole("status")).toContainText("Highlight captured.");

  await page.getByLabel("Search notes").fill("Energy review");
  await expect(page.getByRole("button", { name: /Energy review/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Open map" }).click();
  await expect(
    page.getByRole("img", { name: "Map of personal notes and learning resources" }),
  ).toBeVisible();

  const mapResponse = await page.evaluate(async () => {
    const response = await fetch("/api/knowledge-map");
    return { ok: response.ok, body: await response.json() };
  });
  expect(mapResponse.ok).toBeTruthy();
  expect(mapResponse.body.nodes).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "note" })]),
  );
  expect(mapResponse.body.edges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "resource-link" }),
      expect.objectContaining({ kind: "bookmark" }),
    ]),
  );
});

test("Phase 13 global search ranks local content and exposes discovery filters", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/search");
  await expect(page.getByRole("heading", { name: "Find the next idea." })).toBeVisible();
  await expect(page.getByLabel("Global search")).toBeVisible();

  await page.getByLabel("Global search").fill("motion");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: /matches for/ })).toContainText("motion");
  await expect(page.getByRole("link", { name: "Describing motion", exact: true })).toBeVisible();

  const searchResponse = await page.evaluate(async () => {
    const response = await fetch("/api/search?q=motion&type=lesson");
    return { ok: response.ok, body: await response.json() };
  });
  expect(searchResponse.ok).toBeTruthy();
  expect(searchResponse.body.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        document: expect.objectContaining({ type: "lesson", title: "Describing motion" }),
      }),
    ]),
  );

  await page.getByRole("button", { name: "lesson", exact: true }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("lesson", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Control+K");
  await expect(page.getByLabel("Global search")).toBeFocused();
});

test("Phase 14 learner and teacher analytics summarize local activity", async ({ page }) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await expect(page.getByRole("heading", { name: "Learning dashboard" })).toBeVisible();
  await expect(page.getByText("Weekly study progress").first()).toBeVisible();

  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Learning analytics" })).toBeVisible();
  await expect(page.getByText("Study consistency")).toBeVisible();
  const learnerResponse = await page.evaluate(async () => {
    const response = await fetch("/api/analytics/learner");
    return { ok: response.ok, body: await response.json() };
  });
  expect(learnerResponse.ok).toBeTruthy();
  expect(learnerResponse.body).toMatchObject({
    summary: expect.objectContaining({ questionsAttempted: expect.any(Number) }),
    daily: expect.any(Array),
  });

  await page.goto("/analytics/teacher");
  await expect(page.getByRole("heading", { name: "Teacher analytics" })).toBeVisible();
  await expect(page.getByText("Learners requiring support")).toBeVisible();
  const teacherResponse = await page.evaluate(async () => {
    const response = await fetch("/api/analytics/teacher");
    return { ok: response.ok, body: await response.json() };
  });
  expect(teacherResponse.ok).toBeTruthy();
  expect(teacherResponse.body).toMatchObject({
    learnerProgress: expect.any(Array),
    conceptDifficulty: expect.any(Array),
  });
});

test("Phase 15 portability workspace exports data and rejects invalid restores safely", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/portability");
  await expect(page.getByRole("heading", { name: "Import, export & backup" })).toBeVisible();
  await expect(page.getByText("Export data")).toBeVisible();
  await expect(page.getByText("Automatic backup policy")).toBeVisible();
  await expect(page.getByText("Restore or import")).toBeVisible();

  const exportResponse = await page.evaluate(async () => {
    const response = await fetch("/api/portability/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "content", format: "zip" }),
    });
    return {
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      byteLength: (await response.arrayBuffer()).byteLength,
    };
  });
  expect(exportResponse).toMatchObject({ ok: true, contentType: "application/zip" });
  expect(exportResponse.byteLength).toBeGreaterThan(100);

  const invalidRestore = await page.evaluate(async () => {
    const form = new FormData();
    form.append(
      "file",
      new File(['{"not":"a portability package"}'], "invalid.json", {
        type: "application/json",
      }),
    );
    form.append("mode", "merge");
    form.append("preview", "true");
    const response = await fetch("/api/portability/restore", { method: "POST", body: form });
    return { status: response.status, body: await response.json() };
  });
  expect(invalidRestore.status).toBe(400);
  expect(invalidRestore.body).toMatchObject({ message: expect.any(String) });
});

test("Phase 16 AI studio stays disabled safely and preserves core learning access", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: "AI studio" })).toBeVisible();
  await expect(page.getByText("AI disabled", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Core lessons, practice, search, planning, and analytics continue to work"),
  ).toBeVisible();

  const settingsResponse = await page.evaluate(async () => {
    const response = await fetch("/api/ai/settings");
    return { ok: response.ok, body: await response.json() };
  });
  expect(settingsResponse).toMatchObject({
    ok: true,
    body: { mode: "disabled", hasRemoteApiKey: false },
  });

  const healthResponse = await page.evaluate(async () => {
    const response = await fetch("/api/ai/health");
    return { ok: response.ok, body: await response.json() };
  });
  expect(healthResponse).toMatchObject({
    ok: true,
    body: { provider: "disabled", available: false },
  });
});

test("Phase 17 classroom workspace creates a class, assignment, invitation, and analytics view", async ({
  page,
}) => {
  await page.goto("/profiles");
  await page.getByRole("link", { name: "Select" }).click();
  await page.getByLabel("PIN or password").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/classrooms");
  await expect(page.getByRole("heading", { name: "Classroom command center" })).toBeVisible();
  await page.getByLabel("Class name").fill("E2E Physics classroom");
  await page
    .getByLabel("Description")
    .fill("A classroom created through the Phase 17 browser flow.");
  await page.getByRole("button", { name: "Create classroom" }).click();
  await expect(page.getByRole("status")).toContainText("Classroom created.");
  const classroomLink = page.getByRole("link", { name: /E2E Physics classroom/ });
  await expect(classroomLink).toBeVisible();
  await classroomLink.click();
  await expect(page).toHaveURL(/\/classrooms\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "E2E Physics classroom" })).toBeVisible();

  const classroom = await page.evaluate(async () => {
    const response = await fetch("/api/classrooms");
    const body = (await response.json()) as {
      classes: Array<{ id: string; name: string; joinCode: string }>;
    };
    return body.classes.find((item) => item.name === "E2E Physics classroom") ?? null;
  });
  expect(classroom).not.toBeNull();
  const joinResponse = await page.evaluate(async (joinCode) => {
    const response = await fetch("/api/classrooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode }),
    });
    return { ok: response.ok, body: await response.json() };
  }, classroom!.joinCode);
  expect(joinResponse.ok).toBeTruthy();
  await page.reload();

  await page.getByLabel("Assignment title").fill("E2E explain the evidence");
  await page.getByLabel("Instructions").fill("Write a short explanation for the teacher.");
  await page.getByRole("button", { name: "Publish assignment" }).click();
  await expect(page.getByRole("status")).toContainText("Assignment published");

  const detailResponse = await page.evaluate(async (classId) => {
    const response = await fetch(`/api/classrooms/${classId}`);
    return { ok: response.ok, body: await response.json() };
  }, classroom!.id);
  expect(detailResponse.ok).toBeTruthy();
  expect(detailResponse.body).toMatchObject({
    classroom: { name: "E2E Physics classroom" },
    members: expect.arrayContaining([expect.any(Object)]),
    assignments: [
      expect.objectContaining({ title: "E2E explain the evidence", targetScope: "class" }),
    ],
  });

  const invitationResponse = await page.evaluate(async (classId) => {
    const response = await fetch(`/api/classrooms/${classId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "learner", invitedProfileId: null }),
    });
    return { status: response.status, body: await response.json() };
  }, classroom!.id);
  expect(invitationResponse.status).toBe(201);
  expect(invitationResponse.body).toMatchObject({ role: "learner", status: "pending" });

  const acceptedInvitation = await page.evaluate(async (code) => {
    const response = await fetch("/api/classrooms/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    return { ok: response.ok, body: await response.json() };
  }, invitationResponse.body.code);
  expect(acceptedInvitation.ok).toBeTruthy();
  expect(acceptedInvitation.body).toMatchObject({ role: "learner", status: "accepted" });

  const analyticsResponse = await page.evaluate(async (classId) => {
    const response = await fetch(`/api/classrooms/${classId}/analytics`);
    return { ok: response.ok, body: await response.json() };
  }, classroom!.id);
  expect(analyticsResponse.ok).toBeTruthy();
  expect(analyticsResponse.body).toMatchObject({ memberCount: 1, assignmentCount: 1 });
});
