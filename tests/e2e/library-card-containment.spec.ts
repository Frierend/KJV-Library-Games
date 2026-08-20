import { expect, test } from "@playwright/test";

test.describe("Verse Builder library artwork", () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1366, height: 768 },
  ]) {
    test(`contains preview tiles at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/games");

      const preview = page.locator(".verse-builder-preview");
      await expect(preview).toBeVisible();
      const report = await preview.evaluate((element) => ({
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tileOverflow: Array.from(element.querySelectorAll<HTMLElement>("span")).map((tile) => ({
          horizontal: tile.scrollWidth - tile.clientWidth,
          vertical: tile.scrollHeight - tile.clientHeight,
        })),
      }));

      expect(report.pageOverflow).toBeLessThanOrEqual(1);
      expect(report.tileOverflow).toEqual([
        { horizontal: 0, vertical: 0 },
        { horizontal: 0, vertical: 0 },
        { horizontal: 0, vertical: 0 },
        { horizontal: 0, vertical: 0 },
      ]);
    });
  }
});
