import { expect, test } from "@playwright/test";

test("presentation settings have no serious accessibility violations", async ({ page }) => {
  await page.goto("/studio");
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("presentation settings keep their approved labels and supported controls", async ({ page }) => {
  await page.goto("/studio");

  await expect(page.getByRole("heading", { name: "Presentation Settings" })).toBeVisible();
  await expect(page.getByText("Control how the session appears and behaves when shown on a laptop, TV, or projector. These settings do not change the game content.")).toBeVisible();
  await expect(page.getByRole("group", { name: "Content Display" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Audio & Motion" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Screen & Display" })).toBeVisible();

  const referenceDisplay = page.getByLabel("Bible Reference Display", { exact: true });
  await expect(referenceDisplay).toHaveValue("on-resolution");
  await referenceDisplay.selectOption("always");
  await expect(referenceDisplay).toHaveValue("always");

  const animationLevel = page.getByLabel("Animation Level", { exact: true });
  await expect(animationLevel).toHaveValue("system");
  await animationLevel.selectOption("reduced");
  await expect(animationLevel).toHaveValue("reduced");

  const soundEffects = page.getByRole("checkbox", { name: "Enable Sound Effects" });
  await expect(soundEffects).toBeChecked();
  await soundEffects.uncheck();
  await expect(soundEffects).not.toBeChecked();
  await soundEffects.check();
  await expect(soundEffects).toBeChecked();

  await expect(page.getByRole("checkbox", { name: "Start Session in Fullscreen" })).toBeVisible();
});

test.describe("responsive presentation settings", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("remain compact and touch-friendly on a phone-sized viewport", async ({ page }) => {
    await page.goto("/studio");

    const settings = page.locator(".presentation-settings");
    await expect(settings).toBeVisible();
    await expect(page.getByRole("group", { name: "Content Display" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Audio & Motion" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Screen & Display" })).toBeVisible();

    const hasHorizontalOverflow = await settings.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(hasHorizontalOverflow).toBe(false);

    const soundEffects = page.getByRole("checkbox", { name: "Enable Sound Effects" });
    await soundEffects.click();
    await expect(soundEffects).not.toBeChecked();
  });
});
