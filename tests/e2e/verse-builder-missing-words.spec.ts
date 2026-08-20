import { expect, test } from "@playwright/test";

test.describe("Verse Builder Missing Words", () => {
  test("defaults Quick Play to Missing Words with accessible inline blanks", async ({ page }) => {
    await page.goto("/games/verse-builder");

    await expect(page.getByRole("button", { name: /^Missing Words/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Difficulty").locator("option")).toHaveText([
      "Introductory",
      "Intermediate",
      "Advanced",
    ]);
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByLabel("Custom Number of Verses").fill("1");
    await page.getByRole("button", { name: "Start Verse Builder" }).click();

    await expect(page.locator(".missing-words-board")).toBeVisible();
    await expect(page.locator(".verse-builder-board")).toHaveCount(0);
    await expect(page.locator(".missing-words-reference")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Answer" })).toBeDisabled();

    const labels = await page.getByRole("textbox").evaluateAll((inputs) =>
      inputs.map((input) => input.getAttribute("aria-label")),
    );
    expect(labels.length).toBe(1);
    expect(labels[0]).toMatch(/^Missing word 1 of 1 in /);
    expect(labels[0]).not.toMatch(/\b(God|earth|beginning|created)\b/);
  });

  test("keeps incorrect drafts for a retry without exposing the answer in labels", async ({ page }) => {
    await page.goto("/games/verse-builder");
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByLabel("Custom Number of Verses").fill("1");
    await page.getByRole("button", { name: "Start Verse Builder" }).click();

    const input = page.getByRole("textbox").first();
    await input.fill("wrong");
    await page.getByRole("button", { name: "Submit Answer" }).click();
    await expect(page.locator(".missing-words-board")).toHaveAttribute("data-result", "incorrect");
    await expect(input).toHaveValue("wrong");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toBeFocused();
    await expect(input).not.toHaveAttribute("aria-label", /wrong/i);
  });

  test("supports hosted Missing Words resolution and typing-safe shortcuts", async ({ page }) => {
    await page.goto("/studio");
    await page.getByRole("button", { name: "Remove KJV Bible Quiz" }).click();
    await page.getByRole("button", { name: "Verse Builder", exact: true }).click();
    await expect(page.getByRole("button", { name: "Missing Words", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel("Verse Builder number of verses").fill("1");
    await page.getByLabel("Verse Builder time limit").fill("15");
    await page.getByRole("button", { name: "Start Session", exact: true }).click();
    await expect(page.locator(".missing-words-board")).toBeVisible();

    const input = page.getByRole("textbox").first();
    await input.fill("wrong");
    await input.press("r");
    await expect(input).toHaveValue("wrongr");
    await expect(page.locator(".missing-words-board")).toHaveAttribute("data-result", "unchecked");
    await input.press("Enter");
    await expect(page.locator(".missing-words-board")).toHaveAttribute("data-result", "unchecked");
    await page.getByRole("button", { name: "Submit Answer" }).click();
    await expect(page.locator(".missing-words-board")).toHaveAttribute("data-result", "incorrect");
    await expect(input).toHaveValue("wrongr");

    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await expect(page.locator(".missing-words-board")).toHaveAttribute("data-result", "revealed");
    await expect(page.getByText("Answer revealed.")).toBeVisible();
  });

  test("keeps Missing Words controls contained and touch-sized", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/games/verse-builder");
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByLabel("Custom Number of Verses").fill("1");
    await page.getByRole("button", { name: "Start Verse Builder" }).click();

    const report = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inputs: Array.from(document.querySelectorAll<HTMLInputElement>(".missing-words-input")).map((input) => {
        const rect = input.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    }));
    expect(report.overflow).toBeLessThanOrEqual(1);
    expect(report.inputs.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  });
});
