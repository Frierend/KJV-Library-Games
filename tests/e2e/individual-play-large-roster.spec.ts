import { expect, test, type Page } from "@playwright/test";

const PLAYER_NAMES = Array.from({ length: 20 }, (_, index) => `Player ${String(index + 1).padStart(2, "0")}`);

async function startTwentyPlayerSession(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");
  await page.getByRole("button", { name: /Individual Play/ }).click();

  const addPlayer = page.getByRole("button", { name: "Add Player" });
  for (let index = 1; index < PLAYER_NAMES.length; index += 1) {
    await addPlayer.click();
  }
  for (let index = 0; index < PLAYER_NAMES.length; index += 1) {
    await page.getByLabel(`Player ${index + 1} name`).fill(PLAYER_NAMES[index]);
  }

  await page.getByRole("button", { name: "Start Session", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/session-[^/]+$/);
  await expect(page.getByRole("region", { name: "Host Player Score Controls" })).toBeVisible();
}

test("20-player Individual Play remains scrollable, persistent, and fully inspectable", async ({ page }) => {
  await startTwentyPlayerSession(page);

  const host = page.getByRole("region", { name: "Host Player Score Controls" });
  const cards = host.locator(".score-competitor");
  const scoreList = host.locator(".scoreboard__teams");
  expect(await cards.count()).toBe(20);

  const listMetrics = await scoreList.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(listMetrics.scrollHeight).toBeGreaterThan(listMetrics.clientHeight);
  expect(listMetrics.scrollWidth).toBeLessThanOrEqual(listMetrics.clientWidth + 1);

  await host.getByRole("button", { name: `Add 1 point to ${PLAYER_NAMES[19]}` }).click();
  await expect(cards.filter({ hasText: PLAYER_NAMES[19] }).locator("strong")).toHaveText("1");

  await page.reload();
  const restoredHost = page.getByRole("region", { name: "Host Player Score Controls" });
  await expect(restoredHost.locator(".score-competitor").filter({ hasText: PLAYER_NAMES[19] }).locator("strong")).toHaveText("1");

  await page.getByRole("button", { name: "View All Player Standings" }).click();
  const standings = page.getByRole("dialog", { name: "Player Standings" });
  await expect(standings).toBeVisible();
  expect(await standings.locator(".score-competitor").count()).toBe(20);
  await expect(standings.getByText(PLAYER_NAMES[19], { exact: true })).toBeVisible();
  await standings.getByRole("button", { name: "Close Standings", exact: true }).click();

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(await host.locator(".scoreboard__teams").evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  }
});
