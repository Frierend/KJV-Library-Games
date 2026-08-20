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

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("primary non-gameplay surfaces have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/games", "/studio", "/games/quiz", "/games/four-pics"]) {
    await page.goto(path);
    await expectNoSeriousViolations(page);
  }
});

test("Studio keyboard flow keeps focus visible and dialogs dismiss safely", async ({ page }) => {
  await page.goto("/studio");

  const playFormat = page.getByRole("button", { name: "More information about Play Format" });
  await playFormat.focus();
  await expect(playFormat).toBeFocused();
  await expect(playFormat).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("tooltip")).toContainText("Fellowship Mode");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);

  await page.getByRole("button", { name: /Individual Play/ }).click();
  await page.getByRole("button", { name: "Add Player" }).click();
  await page.getByRole("button", { name: /Team Play/ }).click();
  await expect(page.getByRole("alertdialog", { name: "Change to Team Play?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  const removePlayer = page.getByRole("button", { name: "Remove Player 2" });
  await removePlayer.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Player 2 name")).toHaveCount(0);
});

test.describe("touch and reduced-motion behavior", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("roster actions remain comfortably touch-sized without overflow", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: /Individual Play/ }).click();
    await page.getByRole("button", { name: "Add Player" }).click();

    const removePlayer = page.getByRole("button", { name: "Remove Player 2" });
    const box = await removePlayer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
  });

  test("reduced motion removes nonessential transitions while retaining content", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/studio");

    const motion = await page.locator(".button").first().evaluate((element) => ({
      transitionDuration: getComputedStyle(element).transitionDuration,
      sessionHeading: document.querySelector("h1")?.textContent,
    }));
    expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.01);
    expect(motion.sessionHeading).toBe("Session Studio");
  });
});
