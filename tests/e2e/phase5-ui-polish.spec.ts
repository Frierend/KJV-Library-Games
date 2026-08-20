import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("route headings announce navigation without a visible focus rectangle", async ({ page }) => {
  for (const path of ["/", "/games", "/studio"]) {
    await page.goto(path);
    const heading = page.locator("main h1[tabindex='-1']");
    await expect(heading).toHaveCount(1);
    await expect(heading).toBeFocused();
    await expect(heading).toHaveCSS("outline-style", "none");
  }
});

test("Home presents its primary shortcuts sooner on a laptop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const firstShortcut = page.locator(".journey-card").first();
  const box = await firstShortcut.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeLessThan(675);
  await expectNoHorizontalOverflow(page);
});

test.describe("product surfaces remain usable at representative widths", () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
  ]) {
    test(`${viewport.width}x${viewport.height} has no product overflow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const path of ["/", "/games", "/studio"]) {
        await page.goto(path);
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});
