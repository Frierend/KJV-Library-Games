import { expect, test, type Page } from "@playwright/test";

const ACTIVE_SESSION_KEY = "kjventure.session.v1";

async function startDefaultHostedQuiz(page: Page) {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Start Session", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/session-[^/]+$/);
  await page.locator(".quiz-board.session-game-board").waitFor({ state: "visible" });
}

async function startMixedTeamSession(page: Page, showAudienceScores: boolean) {
  await page.goto("/studio");
  await page.getByRole("button", { name: /family game night/i }).click();
  await page.getByLabel("KJV Bible Quiz number of questions").fill("1");
  await page.getByLabel("4 Pics 1 Word number of puzzles").fill("1");

  const scoreVisibility = page.getByLabel("Show Scores During Gameplay");
  if (showAudienceScores) {
    await scoreVisibility.check();
  } else {
    await scoreVisibility.uncheck();
  }

  await page.getByRole("button", { name: "Start Session", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/session-[^/]+$/);
  await page.locator(".quiz-board.session-game-board").waitFor({ state: "visible" });
}

test("leave dialog freezes and conditionally resumes the hosted timer with focus restored", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeSetInterval = window.setInterval.bind(window);
    const callbacks: Array<() => void> = [];
    const testWindow = window as typeof window & {
      __hostedIntervalCallbacks: Array<() => void>;
    };
    testWindow.__hostedIntervalCallbacks = callbacks;
    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (typeof handler === "function") {
        const callback = handler as (...callbackArgs: unknown[]) => void;
        callbacks.push(() => callback(...args));
      }
      return nativeSetInterval(handler, timeout, ...args);
    }) as typeof window.setInterval;
  });
  await startDefaultHostedQuiz(page);
  const timer = page.getByRole("timer");
  await expect(timer).toHaveAccessibleName(/^\d+ seconds remaining$/);

  const opener = page.getByTitle("Back to Library");
  await opener.click();
  await expect(page.getByRole("alertdialog", { name: "Leave this session?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await expect(timer).toHaveAccessibleName(/^\d+ seconds remaining, paused$/);
  const frozenTime = await timer.textContent();

  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __hostedIntervalCallbacks: Array<() => void>;
    };
    const nativeNow = Date.now;
    Date.now = () => nativeNow() + 5_000;
    try {
      testWindow.__hostedIntervalCallbacks[0]?.();
    } finally {
      Date.now = nativeNow;
    }
  });
  await expect(timer).toHaveText(frozenTime ?? "");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(timer).toHaveAccessibleName(/^\d+ seconds remaining$/);
  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    return stored?.timer?.status;
  }, ACTIVE_SESSION_KEY)).toBe("running");
});

test("confirming Leave persists a paused session that remains recoverable", async ({ page }) => {
  await startDefaultHostedQuiz(page);
  await page.getByTitle("Back to Library").click();
  await page.getByRole("button", { name: "Return to Library" }).click();

  await expect(page.getByRole("heading", { name: "Continue Last Session" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue Session" })).toBeEnabled();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), ACTIVE_SESSION_KEY);
  expect(stored.status).toBe("paused");
  expect(stored.timer.status).toBe("paused");
  expect(stored.timer.remainingMs).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Continue Session" }).click();
  await expect(page.getByRole("timer")).toHaveAccessibleName(/seconds remaining, paused/);
});

for (const showAudienceScores of [true, false]) {
  test(`host scoring, mixed games, and restoration work with audience scores ${showAudienceScores ? "shown" : "hidden"}`, async ({ page }) => {
    await startMixedTeamSession(page, showAudienceScores);
    const stage = page.locator(".session-game-board");
    const audienceScores = stage.getByRole("region", { name: "Audience Standings" });
    const host = page.getByRole("navigation", { name: "Host Controls" });

    await expect(audienceScores).toHaveCount(showAudienceScores ? 1 : 0);
    await expect(host.getByRole("region", { name: "Host Team Score Controls" })).toBeVisible();

    await host.getByRole("button", { name: "Add 1 point to Team 1" }).click();
    await expect(host.getByLabel("Team 1: 1 points")).toBeVisible();
    await host.getByRole("button", { name: "Subtract 1 point from Team 1" }).click();
    await expect(host.getByLabel("Team 1: 0 points")).toBeVisible();
    await host.getByRole("button", { name: "Add 1 point to Team 1" }).click();
    await host.getByRole("button", { name: "Undo last score change" }).click();
    await expect(host.getByLabel("Team 1: 0 points")).toBeVisible();
    await host.getByRole("button", { name: "Add 1 point to Team 1" }).click();

    if (showAudienceScores) {
      await expect(audienceScores.getByLabel("Team 1: 1 points")).toBeVisible();
    }

    await host.getByRole("button", { name: "Reveal Answer" }).click();
    await host.getByRole("button", { name: "Next" }).click();
    await expect(page.locator(".four-pics-board.session-game-board")).toBeVisible();
    await expect(host.getByLabel("Team 1: 1 points")).toBeVisible();
    await expect(page.locator(".session-game-board").getByRole("region", { name: "Audience Standings" }))
      .toHaveCount(showAudienceScores ? 1 : 0);

    await page.reload();
    const restoredStage = page.locator(".four-pics-board.session-game-board");
    const restoredHost = page.getByRole("navigation", { name: "Host Controls" });
    await expect(restoredStage).toBeVisible();
    await expect(restoredHost.getByLabel("Team 1: 1 points")).toBeVisible();
    await expect(restoredStage.getByRole("region", { name: "Audience Standings" }))
      .toHaveCount(showAudienceScores ? 1 : 0);

    const letter = restoredStage.locator(".letter-bank button").first();
    await letter.click();
    await expect(letter).toHaveAttribute("aria-pressed", "true");
  });
}
