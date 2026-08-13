import { expect, test, type Page } from "@playwright/test";

async function openQuickGame(
  page: Page,
  game: "quiz" | "four-pics",
  source: "home" | "explore",
) {
  await page.goto(source === "home" ? "/" : "/games");
  if (source === "home") {
    await page.getByRole("button", { name: "Explore Games" }).click();
  }
  await expect(page.getByRole("heading", { name: "Explore Games" })).toBeVisible();
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: game === "quiz" ? "KJV Bible Quiz" : "4 Pics 1 Word" }),
  });
  await card.getByRole("button", { name: /open game/i }).click();
  await expect(
    page.getByRole("button", { name: game === "quiz" ? "Start Quiz" : "Start Game" }),
  ).toBeVisible();
}

async function startQuickGame(page: Page, game: "quiz" | "four-pics") {
  await page.getByRole("button", { name: game === "quiz" ? "Start Quiz" : "Start Game" }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: game === "quiz" ? /.+/ : /Round 1: Find the Bible word/i,
    }),
  ).toBeFocused();
}

test("Quick Play starts from Home and Explore with meaningful focus and working flow", async ({ page }) => {
  for (const source of ["home", "explore"] as const) {
    for (const game of ["quiz", "four-pics"] as const) {
      await openQuickGame(page, game, source);
      await startQuickGame(page, game);

      const heading = page.getByRole("heading", {
        level: 1,
        name: game === "four-pics" ? /Round 1: Find the Bible word/i : /.+/,
      });
      const initialTimer = await page.getByRole("timer").textContent();
      await expect.poll(() => page.getByRole("timer").textContent()).not.toBe(initialTimer);
      await expect(heading).toBeFocused();

      await page.getByRole("button", { name: /reveal answer/i }).click();
      await expect(page.getByText(/answer:/i)).toBeVisible();
      await page.getByRole("button", { name: /^Next/ }).click();
      await expect(page.getByText(game === "quiz" ? /Question 2 of/ : /Round 2 of/)).toBeVisible();
    }
  }
});

test("fullscreen failures are announced, retryable, and do not create page errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    let activeElement: Element | null = null;
    let requestAttempts = 0;
    let exitAttempts = 0;
    Object.defineProperty(Document.prototype, "fullscreenElement", {
      configurable: true,
      get: () => activeElement,
    });
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: function requestFullscreen() {
        requestAttempts += 1;
        if (requestAttempts === 1) return Promise.reject(new Error("permission denied"));
        activeElement = this;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
    Object.defineProperty(Document.prototype, "exitFullscreen", {
      configurable: true,
      value: function exitFullscreen() {
        exitAttempts += 1;
        if (exitAttempts === 1) return Promise.reject(new Error("permission denied"));
        activeElement = null;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
  });
  await openQuickGame(page, "quiz", "explore");
  await startQuickGame(page, "quiz");

  const fullscreen = page.getByRole("button", { name: "Enter Fullscreen" });
  await fullscreen.click();
  await expect(page.locator(".fullscreen-feedback")).toHaveText(/Fullscreen could not be entered/);
  await expect(fullscreen).toBeFocused();
  await expect(fullscreen).toHaveAttribute("aria-pressed", "false");

  await fullscreen.click();
  await expect(page.getByRole("button", { name: "Exit Fullscreen" })).toBeVisible();
  await expect(page.locator(".fullscreen-feedback")).toHaveCount(0);

  const exit = page.getByRole("button", { name: "Exit Fullscreen" });
  await exit.click();
  await expect(page.locator(".fullscreen-feedback")).toHaveText(/Fullscreen could not be exited/);
  await expect(exit).toBeFocused();
  await expect(exit).toHaveAttribute("aria-pressed", "true");

  await exit.click();
  await expect(page.getByRole("button", { name: "Enter Fullscreen" })).toBeVisible();
  await expect(page.locator(".fullscreen-feedback")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("unsupported fullscreen is disclosed and Session Studio does not offer a misleading option", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(Document.prototype, "exitFullscreen", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/games/quiz");
  await startQuickGame(page, "quiz");
  await expect(page.locator(".fullscreen-feedback")).toHaveText("Fullscreen is unavailable in this browser.");
  await expect(page.getByRole("button", { name: "Enter Fullscreen" })).toBeDisabled();

  await page.goto("/studio");
  await expect(page.getByText("Fullscreen is unavailable in this browser.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Start Session in Fullscreen" })).toBeDisabled();
});

test("automatic fullscreen rejection still starts a hosted session and offers a manual retry", async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new Error("permission denied"));
  });
  await page.goto("/studio");
  const preference = page.getByRole("checkbox", { name: "Start Session in Fullscreen" });
  await preference.check();
  await page.getByRole("button", { name: "Start Session", exact: true }).click();

  await expect(page.locator(".session-player")).toBeVisible();
  await expect(page.locator(".fullscreen-feedback")).toHaveText(/Fullscreen could not be entered/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const retry = page.getByRole("button", { name: "Enter Fullscreen" });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(page.locator(".fullscreen-feedback")).toHaveText(/Fullscreen could not be entered/);
});

test("Quick Play focus and feedback remain usable at representative viewports", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Representative responsive check runs once.");
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await openQuickGame(page, "quiz", "explore");
    await startQuickGame(page, "quiz");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator(".fullscreen-feedback")).toHaveCount(0);
    const undersized = await page.locator(".play-shell button:not([disabled])").evaluateAll((buttons) =>
      buttons
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return { label: button.getAttribute("aria-label") ?? button.textContent, width: rect.width, height: rect.height };
        })
        .filter(({ width, height }) => width > 0 && height > 0 && (width < 44 || height < 44)),
    );
    expect(undersized).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`quick-play-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
});
