import { expect, test, type Page } from "@playwright/test";

async function addSegmentsInOrder(page: Page, reverse = false) {
  const labels = await page.getByRole("button", { name: /^Add segment/ }).evaluateAll((buttons) =>
    buttons.map((button) => {
      const match = button.getAttribute("aria-label")?.match(/^Add segment (\d+) of/);
      return Number(match?.[1]);
    }),
  );
  const positions = labels.sort((left, right) => reverse ? right - left : left - right);
  for (const position of positions) {
    await page.getByRole("button", { name: new RegExp(`^Add segment ${position} of`) }).click();
  }
}

async function expectNoSeriousViolations(page: Page) {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
}

test.describe("Verse Builder Phase 13 production smoke", () => {
  test("Quick Play supports setup validation, retry, reveal, and completion", async ({ page }) => {
    await page.goto("/games/verse-builder");

    await expect(page.getByRole("heading", { name: "Verse Builder" })).toBeVisible();
    await expect(page.getByText("60 seconds per verse")).toBeVisible();
    for (const count of ["5", "10", "15", "20", "Custom"]) {
      await expect(page.getByRole("button", { name: count, exact: true })).toBeVisible();
    }
    await expect(page.getByLabel("Difficulty")).toHaveValue("all");
    await expect(page.getByLabel("Difficulty").locator("option")).toHaveText([
      "All difficulties",
      "Introductory",
      "Intermediate",
      "Advanced",
    ]);

    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByLabel("Custom Number of Verses").fill("21");
    await page.getByRole("button", { name: "Start Verse Builder" }).click();
    await expect(page.getByRole("alert")).toHaveText(/Only 20 all difficulties verses are available/);

    await page.getByLabel("Custom Number of Verses").fill("1");
    await page.getByRole("button", { name: "Start Verse Builder" }).click();
    await expect(page.getByRole("timer")).toHaveText("1:00");
    await expect(page.getByRole("button", { name: "Submit Answer" })).toBeDisabled();
    await expect(page.locator(".feedback")).toHaveText("");

    await page.getByRole("button", { name: /^Add segment/ }).first().click();
    await expect(page.getByRole("button", { name: "Submit Answer" })).toBeDisabled();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await addSegmentsInOrder(page, true);
    await expect(page.getByRole("button", { name: "Submit Answer" })).toBeEnabled();
    await page.getByRole("button", { name: "Submit Answer" }).click();
    await expect(page.locator(".feedback")).toContainText("Try again");
    await expect(page.locator(".verse-builder-board")).toHaveAttribute("data-result", "incorrect");

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await addSegmentsInOrder(page);
    await page.getByRole("button", { name: "Submit Answer" }).click();
    await expect(page.locator(".verse-builder-board")).toHaveAttribute("data-result", "correct");
    await expect(page.locator(".verse-builder-canonical-text")).toBeVisible();
    await expect(page.locator(".feedback span")).toBeVisible();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByRole("heading", { name: "Verse Builder Complete" })).toBeVisible();
  });

  test("Hosted Verse Builder uses the shared timer and resolution lifecycle", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: "Remove KJV Bible Quiz" }).click();
    await page.getByRole("button", { name: "Verse Builder", exact: true }).click();

    const count = page.getByLabel("Verse Builder number of verses");
    const timer = page.getByLabel("Verse Builder time limit");
    await expect(count).toHaveAttribute("max", "20");
    await expect(timer).toHaveValue("60");
    await count.fill("1");
    const referenceDisplay = page.getByLabel("Bible Reference Display", { exact: true });
    await referenceDisplay.selectOption("always");
    await expect(referenceDisplay).toHaveValue("always");
    await page.getByLabel("When Time Expires", { exact: true }).selectOption("require-reveal");
    await timer.fill("15");
    await page.getByRole("button", { name: "Start Session", exact: true }).click();

    await expect(page.locator(".session-player")).toBeVisible();
    await expect(page.getByRole("timer")).toHaveText(/0:1[1-5]|0:0[6-9]/);
    await expect(page.locator(".feedback span")).toBeVisible();
    await expect(page.locator(".verse-builder-canonical-text")).toHaveCount(0);

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveText("0:00", { timeout: 20_000 });
    await expect(page.locator(".feedback")).toContainText("Reveal the answer to continue");
    await expect(page.getByRole("button", { name: "Finish" })).toBeDisabled();

    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await expect(page.locator(".verse-builder-canonical-text")).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish" })).toBeEnabled();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByRole("heading", { name: "Final Results" })).toBeVisible();
  });

  test("Verse Builder remains accessible and contained at representative viewports", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Focused responsive and axe audit runs once.");
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/games/verse-builder");
      await page.getByRole("button", { name: "Start Verse Builder" }).click();
      await expect(page.locator(".verse-builder-board")).toBeVisible();
      await expectNoSeriousViolations(page);
      const report = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        undersized: Array.from(document.querySelectorAll<HTMLButtonElement>(".play-shell button:not([disabled])"))
          .map((button) => {
            const rect = button.getBoundingClientRect();
            return { label: button.getAttribute("aria-label") ?? button.textContent, width: rect.width, height: rect.height };
          })
          .filter(({ width, height }) => width > 0 && height > 0 && (width < 44 || height < 44)),
      }));
      expect(report.overflow).toBeLessThanOrEqual(1);
      expect(report.undersized).toEqual([]);
    }
  });
});
