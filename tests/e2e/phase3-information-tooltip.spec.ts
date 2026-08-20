import { expect, test } from "@playwright/test";

test("contextual information supports hover, keyboard, dismissal, and touch", async ({ page }) => {
  await page.goto("/studio");

  const playFormat = page.getByRole("button", { name: "More information about Play Format" });
  await playFormat.focus();
  await expect(page.getByRole("tooltip")).toContainText("Fellowship Mode");
  await expect(playFormat).toHaveAttribute("aria-describedby", /.+/);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);

  await playFormat.hover();
  await expect(page.getByRole("tooltip")).toContainText("Study Mode");
  await page.mouse.click(8, 8);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test.describe("touch-sized Studio guidance", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("opens by tap without disrupting the compact settings layout", async ({ page }) => {
    await page.goto("/studio");
    const contentPack = page.getByRole("button", { name: "More information about Content Pack" });
    await contentPack.scrollIntoViewIfNeeded();
    const box = await contentPack.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(32);
    expect(box!.height).toBeGreaterThanOrEqual(32);

    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.getByRole("tooltip")).toContainText("built-in KJVenture library");
    await page.mouse.click(8, 8);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });
});
