import { expect, test, type Page } from "@playwright/test";

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertVisiblePlayTargets(page: Page) {
  const undersized = await page.locator(".play-shell button:not([disabled])").evaluateAll(
    (buttons) =>
      buttons
        .filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return { label: button.getAttribute("aria-label") ?? button.textContent, width: rect.width, height: rect.height };
        })
        .filter(({ width, height }) => width < 44 || height < 44),
  );
  expect(undersized).toEqual([]);
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
]) {
  test(`Four Pics remains operable at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/games/four-pics");
    await page.getByRole("button", { name: /start game/i }).click();
    await expect(page.locator(".four-pics-board")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertVisiblePlayTargets(page);

    const columns = await page.locator(".four-pics-board").evaluate(
      (board) => getComputedStyle(board).gridTemplateColumns.split(" ").filter(Boolean).length,
    );
    if (viewport.width >= 1050 || (viewport.width > viewport.height && viewport.width >= 820)) {
      expect(columns).toBeGreaterThanOrEqual(2);
    } else {
      expect(columns).toBe(1);
    }

    await page.screenshot({
      path: testInfo.outputPath(`four-pics-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  });
}

test("hosted quiz guards Next and fits a desktop stage", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/studio");
  await page.getByRole("button", { name: /start session/i }).click();
  await expect(page).toHaveURL(/\/play\/session-[^/]+$/);
  const sessionPlayer = page.locator("main.session-player");
  await sessionPlayer.waitFor({ state: "visible" });
  await expect(sessionPlayer.locator(".progress-label")).toHaveText("Round 1 of 10");
  await expect(page.getByRole("button", { name: /^next/i })).toBeDisabled();
  await assertNoHorizontalOverflow(page);
  await assertVisiblePlayTargets(page);
});
