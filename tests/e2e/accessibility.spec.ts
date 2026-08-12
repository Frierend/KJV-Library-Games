import { expect, test, type Page } from "@playwright/test";

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

test("library, Studio, and gameplay have no serious axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Session Studio" })).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByRole("button", { name: "Start Session", exact: true }).click();
  await expect(page.getByText(/round 1 of 10/i)).toBeVisible();
  await expectNoSeriousViolations(page);
});
