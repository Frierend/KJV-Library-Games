import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const TEAM_NAMES = [
  "A",
  "Bethlehem Fellowship",
  "Z",
  "Jerusalem Bible Scholars",
  "Grace",
  "New Jerusalem Champions",
] as const;

const TEAM_SCORES = [2, 1, -1, 3, 0, -2] as const;
const RANKED_TEAM_NAMES = [
  "Jerusalem Bible Scholars",
  "A",
  "Bethlehem Fellowship",
  "Grace",
  "Z",
  "New Jerusalem Champions",
] as const;

const VIEWPORTS = [
  { width: 1920, height: 1080, label: "1920x1080" },
  { width: 1440, height: 900, label: "1440x900" },
  { width: 1366, height: 768, label: "1366x768" },
  { width: 768, height: 1024, label: "768x1024" },
  { width: 844, height: 390, label: "844x390" },
] as const;

async function startSixTeamSession(page: Page, showAudienceScores: boolean) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio");
  await page.getByRole("button", { name: /family game night/i }).click();
  await page.getByLabel("KJV Bible Quiz number of questions").fill("1");
  await page.getByLabel("4 Pics 1 Word number of puzzles").fill("1");
  await page.getByLabel("KJV Bible Quiz time limit").fill("300");
  await page.getByLabel("4 Pics 1 Word time limit").fill("300");

  const addTeam = page.getByRole("button", { name: "Add Team" });
  for (let index = 2; index < TEAM_NAMES.length; index += 1) {
    await addTeam.click();
  }
  for (let index = 0; index < TEAM_NAMES.length; index += 1) {
    await page.getByLabel(`Team ${index + 1} name`).fill(TEAM_NAMES[index]);
  }

  const scoreVisibility = page.getByLabel("Show Scores During Gameplay");
  if (showAudienceScores) {
    await scoreVisibility.check();
  } else {
    await scoreVisibility.uncheck();
  }

  await page.getByRole("button", { name: "Start Session", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/session-[^/]+$/);
  await expect(page.locator(".quiz-board.session-game-board")).toBeVisible();

  const host = page.getByRole("navigation", { name: "Host Controls" });
  for (let index = 0; index < TEAM_NAMES.length; index += 1) {
    const score = TEAM_SCORES[index];
    const buttonName = score >= 0
      ? `Add 1 point to ${TEAM_NAMES[index]}`
      : `Subtract 1 point from ${TEAM_NAMES[index]}`;
    for (let click = 0; click < Math.abs(score); click += 1) {
      await host.getByRole("button", { name: buttonName }).click();
    }
  }
  await host.getByRole("button", { name: "Add 1 point to Grace" }).click();
  await host.getByRole("button", { name: "Undo last score change" }).click();
}

async function assertResponsiveScoreLayout(
  page: Page,
  game: "quiz" | "four-pics",
  showAudienceScores: boolean,
) {
  const report = await page.evaluate(
    ({ expectedNames, expectedScores, gameId, showScores }) => {
      const rect = (element: Element) => {
        const value = element.getBoundingClientRect();
        return {
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          left: value.left,
          width: value.width,
          height: value.height,
        };
      };
      const overlaps = (first: ReturnType<typeof rect>, second: ReturnType<typeof rect>) =>
        first.left < second.right - 1 &&
        first.right > second.left + 1 &&
        first.top < second.bottom - 1 &&
        first.bottom > second.top + 1;

      const stage = document.querySelector<HTMLElement>(`.${gameId === "quiz" ? "quiz-board" : "four-pics-board"}.session-game-board`);
      const host = document.querySelector<HTMLElement>('[aria-label="Host Team Score Controls"]');
      const audience = stage?.querySelector<HTMLElement>('[aria-label="Audience Standings"]') ?? null;
      const undo = host?.querySelector<HTMLElement>('[aria-label="Undo last score change"]') ?? null;
      const cards = host ? Array.from(host.querySelectorAll<HTMLElement>(".score-team")) : [];
      const names = cards.map((card) => card.querySelector<HTMLElement>(".score-team__name"));
      const scores = cards.map((card) => card.querySelector<HTMLElement>("strong"));
      const buttons = host ? Array.from(host.querySelectorAll<HTMLElement>("button")) : [];
      const cardRects = cards.map(rect);
      const stageRect = stage ? rect(stage) : null;
      const hostRect = host ? rect(host) : null;

      return {
        audienceCount: audience ? 1 : 0,
        audienceNames: audience
          ? Array.from(audience.querySelectorAll<HTMLElement>(".score-team__name"), (name) => name.textContent)
          : [],
        audienceNameLayout: audience
          ? Array.from(audience.querySelectorAll<HTMLElement>(".score-team__name"), (name) => {
              const style = getComputedStyle(name);
              return {
                overflow: style.overflow,
                textOverflow: style.textOverflow,
                whiteSpace: style.whiteSpace,
                clipped: name.scrollWidth > name.clientWidth + 1 || name.scrollHeight > name.clientHeight + 1,
              };
            })
          : [],
        buttons: buttons.map((button) => ({
          label: button.getAttribute("aria-label"),
          ...rect(button),
        })),
        cardCount: cards.length,
        cardsInsideViewport: cardRects.every((card) =>
          card.top >= -1 && card.left >= -1 && card.right <= innerWidth + 1 && card.bottom <= innerHeight + 1),
        cardsOverlap: cardRects.some((card, index) =>
          cardRects.slice(index + 1).some((other) => overlaps(card, other))),
        expectedNames,
        expectedScores,
        hostNames: names.map((name) => name?.textContent ?? null),
        hostNameLayout: names.map((name) => {
          if (!name) return null;
          const style = getComputedStyle(name);
          return {
            overflow: style.overflow,
            textOverflow: style.textOverflow,
            whiteSpace: style.whiteSpace,
            fontSize: Number.parseFloat(style.fontSize),
            clipped: name.scrollWidth > name.clientWidth + 1 || name.scrollHeight > name.clientHeight + 1,
          };
        }),
        hostScores: scores.map((score) => Number(score?.textContent ?? Number.NaN)),
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        scoreControlsInsideCards: cards.every((card) =>
          Array.from(card.querySelectorAll("strong, button")).every((control) => {
            const cardRect = rect(card);
            const controlRect = rect(control);
            return controlRect.left >= cardRect.left - 1 &&
              controlRect.right <= cardRect.right + 1 &&
              controlRect.top >= cardRect.top - 1 &&
              controlRect.bottom <= cardRect.bottom + 1;
          })),
        showScores,
        stageInsideViewport: Boolean(stageRect) &&
          stageRect!.top >= -1 && stageRect!.left >= -1 &&
          stageRect!.right <= innerWidth + 1 && stageRect!.bottom <= innerHeight + 1,
        stageOverlapsHostScores: Boolean(stageRect && hostRect && overlaps(stageRect, hostRect)),
        undoInsideViewport: Boolean(undo) && (() => {
          const undoRect = rect(undo!);
          return undoRect.top >= -1 && undoRect.left >= -1 &&
            undoRect.right <= innerWidth + 1 && undoRect.bottom <= innerHeight + 1;
        })(),
      };
    },
    {
      expectedNames: [...TEAM_NAMES],
      expectedScores: [...TEAM_SCORES],
      gameId: game,
      showScores: showAudienceScores,
    },
  );
  expect(report.cardCount).toBe(6);
  expect(report.hostNames).toEqual([...TEAM_NAMES]);
  expect(report.hostScores).toEqual([...TEAM_SCORES]);
  expect(report.hostNameLayout).not.toContain(null);
  for (const name of report.hostNameLayout) {
    expect(name?.clipped).toBe(false);
    expect(name?.textOverflow).not.toBe("ellipsis");
    expect(name?.overflow).not.toBe("hidden");
    expect(name?.whiteSpace).not.toBe("nowrap");
    expect(name?.fontSize).toBeGreaterThanOrEqual(12);
  }
  expect(report.audienceCount).toBe(showAudienceScores ? 1 : 0);
  expect(report.audienceNames).toEqual(showAudienceScores ? [...RANKED_TEAM_NAMES] : []);
  for (const name of report.audienceNameLayout) {
    expect(name.clipped).toBe(false);
    expect(name.textOverflow).not.toBe("ellipsis");
    expect(name.overflow).not.toBe("hidden");
    expect(name.whiteSpace).not.toBe("nowrap");
  }
  expect(report.cardsInsideViewport).toBe(true);
  expect(report.undoInsideViewport).toBe(true);
  expect(report.scoreControlsInsideCards).toBe(true);
  expect(report.cardsOverlap).toBe(false);
  expect(report.stageInsideViewport).toBe(true);
  expect(report.stageOverlapsHostScores).toBe(false);
  expect(report.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(report.buttons).toHaveLength(15);
  for (const button of report.buttons) {
    expect(button.width, button.label ?? "score button width").toBeGreaterThanOrEqual(44);
    expect(button.height, button.label ?? "score button height").toBeGreaterThanOrEqual(44);
    expect(button.top).toBeGreaterThanOrEqual(-1);
    expect(button.right).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(button.bottom).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    expect(button.left).toBeGreaterThanOrEqual(-1);
  }
}

async function captureLayout(
  page: Page,
  testInfo: TestInfo,
  game: "quiz" | "four-pics",
  visibility: "shown" | "hidden",
  viewport: string,
) {
  if (testInfo.project.name !== "chromium") return;
  const directory = join("test-results", "host-scoring-responsive-after-fix");
  mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: join(directory, `${game}-audience-${visibility}-${viewport}.png`),
  });
}

for (const showAudienceScores of [true, false]) {
  const visibility = showAudienceScores ? "shown" : "hidden";

  test(`six-team hosted scoring fits every viewport with audience scores ${visibility}`, async ({ page }, testInfo) => {
    await startSixTeamSession(page, showAudienceScores);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => scrollTo(0, 0));
      await assertResponsiveScoreLayout(page, "quiz", showAudienceScores);
      await captureLayout(page, testInfo, "quiz", visibility, viewport.label);
    }

    const firstAnswer = page.locator(".quiz-board .choice-button").first();
    await firstAnswer.click();
    await expect(firstAnswer).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(() => scrollTo(0, 0));
    await assertResponsiveScoreLayout(page, "quiz", showAudienceScores);

    const host = page.getByRole("navigation", { name: "Host Controls" });
    await host.getByRole("button", { name: "Reveal Answer" }).click();
    await host.getByRole("button", { name: "Next" }).click();
    await expect(page.locator(".four-pics-board.session-game-board")).toBeVisible();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => scrollTo(0, 0));
      await assertResponsiveScoreLayout(page, "four-pics", showAudienceScores);
      await captureLayout(page, testInfo, "four-pics", visibility, viewport.label);
    }

    const firstLetter = page.locator(".four-pics-board .letter-bank button").first();
    await firstLetter.click();
    await expect(firstLetter).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(page.locator(".four-pics-board.session-game-board")).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await assertResponsiveScoreLayout(page, "four-pics", showAudienceScores);
  });
}
