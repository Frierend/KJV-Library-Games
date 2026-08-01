import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const ACTIVE_SESSION_KEY = "kjventure.session.v1";
const SCREENSHOT_DIRECTORY = join("test-results", "hosted-timer-after-fix");

async function startSixTeamMixedSession(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");
  await page.getByRole("button", { name: /family game night/i }).click();
  await page.getByLabel("KJV Bible Quiz rounds").fill("1");
  await page.getByLabel("4 Pics 1 Word rounds").fill("1");
  await page.getByLabel("KJV Bible Quiz timer seconds").fill("300");
  await page.getByLabel("4 Pics 1 Word timer seconds").fill("300");

  const names = [
    "A",
    "Bethlehem Fellowship",
    "Z",
    "Jerusalem Bible Scholars",
    "Grace",
    "New Jerusalem Champions",
  ];
  const addTeam = page.getByRole("button", { name: "Add Team" });
  for (let index = 2; index < names.length; index += 1) {
    await addTeam.click();
  }
  for (let index = 0; index < names.length; index += 1) {
    await page.getByLabel(`Team ${index + 1} name`).fill(names[index]);
  }

  await page.getByRole("button", { name: /start session/i }).click();
  await expect(page.locator(".quiz-board.session-game-board")).toBeVisible();
}

async function capture(page: Page, testInfo: TestInfo, name: string, fullPage = false) {
  if (testInfo.project.name !== "chromium") return;
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ path: join(SCREENSHOT_DIRECTORY, name), fullPage });
}

test("hosted Quiz countdown, pause, resume, and restoration use clock formatting", async ({ page }, testInfo) => {
  await startSixTeamMixedSession(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => scrollTo(0, 0));

  const timer = page.getByRole("timer");
  await expect(timer).toHaveText("5:00");
  await expect(timer).toHaveAccessibleName("5 minutes remaining");
  await expect(timer).toHaveText("4:59");
  await expect(timer).toHaveAccessibleName("4 minutes 59 seconds remaining");
  await capture(page, testInfo, "quiz-running-844x390.png");

  const host = page.getByRole("navigation", { name: "Host controls" });
  await host.getByRole("button", { name: "Pause" }).click();
  const pausedValue = await timer.textContent();
  await expect(timer).toHaveAccessibleName(/remaining, paused$/);
  await capture(page, testInfo, "quiz-paused-844x390.png");

  await page.reload();
  const restoredTimer = page.getByRole("timer");
  await expect(restoredTimer).toHaveText(pausedValue ?? "");
  await expect(restoredTimer).toHaveAccessibleName(/remaining, paused$/);

  const restoredHost = page.getByRole("navigation", { name: "Host controls" });
  await restoredHost.getByRole("button", { name: "Resume" }).click();
  await expect(restoredTimer).not.toHaveText(pausedValue ?? "");
  await expect(restoredTimer).toHaveAccessibleName(/remaining$/);
});

test("hosted Four Pics formats time and keeps resolved feedback and navigation unobscured", async ({ page }, testInfo) => {
  await startSixTeamMixedSession(page);
  const host = page.getByRole("navigation", { name: "Host controls" });
  await host.getByRole("button", { name: "Reveal Answer" }).click();
  await host.getByRole("button", { name: "Next" }).click();
  await expect(page.locator(".four-pics-board.session-game-board")).toBeVisible();

  const timer = page.getByRole("timer");
  await expect(timer).toHaveText("5:00");
  await expect(timer).toHaveAccessibleName("5 minutes remaining");

  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => scrollTo(0, 0));
  await capture(page, testInfo, "four-pics-running-844x390.png");

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => scrollTo(0, 0));
  await capture(page, testInfo, "four-pics-running-1366x768.png");

  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("navigation", { name: "Host controls" })
    .getByRole("button", { name: "Reveal Answer" })
    .click();
  const feedback = page.locator(".four-pics-board .feedback:not(.feedback--empty)");
  const navigation = page.locator(".host-control-dock__navigation");
  await expect(feedback).toBeVisible();

  const overlap = await page.evaluate(() => {
    const feedbackElement = document.querySelector<HTMLElement>(".four-pics-board .feedback:not(.feedback--empty)");
    const navigationElement = document.querySelector<HTMLElement>(".host-control-dock__navigation");
    if (!feedbackElement || !navigationElement) return true;
    const first = feedbackElement.getBoundingClientRect();
    const second = navigationElement.getBoundingClientRect();
    return first.left < second.right && first.right > second.left &&
      first.top < second.bottom && first.bottom > second.top;
  });
  expect(overlap).toBe(false);
  await capture(page, testInfo, "four-pics-resolved-feedback-844x390-full.png", true);

  await navigation.scrollIntoViewIfNeeded();
  const resetRound = navigation.getByRole("button", { name: "Reset Round" });
  await expect(resetRound).toBeVisible();
  await capture(page, testInfo, "four-pics-resolved-navigation-844x390.png");
  await resetRound.click();
  await expect(page.locator(".four-pics-board .feedback--empty")).toHaveCount(1);

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript((key) => {
    const marker = "kjventure.timer-expiry-fixture";
    if (sessionStorage.getItem(marker)) return;
    sessionStorage.setItem(marker, "applied");
    const session = JSON.parse(localStorage.getItem(key) ?? "null");
    const round = session.preparedRounds[session.roundIndex];
    session.roundStates[round.id].result = "expired";
    session.timer.remainingMs = 0;
    session.timer.status = "expired";
    localStorage.setItem(key, JSON.stringify(session));
  }, ACTIVE_SESSION_KEY);
  await page.reload();
  const expiredTimer = page.getByRole("timer");
  await expect(expiredTimer).toHaveText("0:00");
  await expect(expiredTimer).toHaveAccessibleName("0 seconds remaining");
  await capture(page, testInfo, "four-pics-expired-1366x768.png");
});

test("a disabled hosted timer shows the no-timer state without a numeric clock", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel("No timer").check();
  await page.getByRole("button", { name: /start session/i }).click();

  const timer = page.getByRole("timer", { name: "No timer" });
  await expect(timer).toHaveText("No timer");
  await expect(timer).not.toHaveText(/\d+:\d+/);
});
