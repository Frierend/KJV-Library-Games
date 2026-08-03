import { expect, test, type Page, type TestInfo } from "@playwright/test";

const ACTIVE_SESSION_KEY = "kjventure.session.v1";
const LAYOUT_FIXTURE_KEY = "kjventure.layout-audit-fixture";

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1920, height: 820 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
] as const;

async function startStudyFixture(page: Page) {
  await page.addInitScript(
    ({ activeSessionKey, fixtureKey }) => {
      const fixture = JSON.parse(sessionStorage.getItem(fixtureKey) ?? "null") as {
        gameId: "quiz" | "four-pics";
        contentId: string;
      } | null;
      const session = JSON.parse(localStorage.getItem(activeSessionKey) ?? "null");
      if (!fixture || !session) return;
      const roundIndex = session.preparedRounds.findIndex(
        (round: { gameId: string }) => round.gameId === fixture.gameId,
      );
      if (roundIndex < 0) return;
      const round = session.preparedRounds[roundIndex];
      round.contentId = fixture.contentId;
      session.roundIndex = roundIndex;
      session.status = "active";
      session.config.mode = "study";
      session.config.referenceDisplay = "on-resolution";
      session.roundStates[round.id] =
        fixture.gameId === "quiz"
          ? {
              gameId: "quiz",
              result: "revealed",
              selectedIndex: null,
              wrongIndex: null,
              eliminatedOptionIds: [],
            }
          : {
              gameId: "four-pics",
              result: "revealed",
              selectedIds: [],
              revealedHintPositions: [...round.hintPositions],
            };
      session.timer = {
        enabled: false,
        durationMs: 0,
        remainingMs: 0,
        status: "idle",
      };
      localStorage.setItem(activeSessionKey, JSON.stringify(session));
    },
    { activeSessionKey: ACTIVE_SESSION_KEY, fixtureKey: LAYOUT_FIXTURE_KEY },
  );
  await page.goto("/studio");
  await page.getByRole("button", { name: /Bible Study Review/i }).click();
  await page.getByRole("button", { name: /start session/i }).click();
  await expect(page).toHaveURL(/\/play\/session-[^/]+$/);
}

async function showResolvedRecord(
  page: Page,
  gameId: "quiz" | "four-pics",
  contentId: string,
) {
  await page.evaluate(
    ({ key, fixture }) => sessionStorage.setItem(key, JSON.stringify(fixture)),
    {
      key: LAYOUT_FIXTURE_KEY,
      fixture: { gameId, contentId },
    },
  );
  await page.reload();
  await expect(
    page.locator(gameId === "quiz" ? ".quiz-board" : ".four-pics-board"),
  ).toBeVisible();
  await expect(page.locator(".feedback--revealed")).toBeVisible();
}

async function assertSafeGameplayLayout(page: Page, gameId: "quiz" | "four-pics") {
  const stage = page.locator(gameId === "quiz" ? ".quiz-board" : ".four-pics-board");
  const feedback = stage.locator(".feedback--revealed");
  await feedback.scrollIntoViewIfNeeded();

  const report = await page.evaluate((game) => {
    const stageElement = document.querySelector<HTMLElement>(
      game === "quiz" ? ".quiz-board" : ".four-pics-board",
    );
    const feedbackElement = stageElement?.querySelector<HTMLElement>(".feedback--revealed");
    const dock = document.querySelector<HTMLElement>(".host-control-dock");
    if (!stageElement || !feedbackElement || !dock) return null;

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
    const inside = (child: ReturnType<typeof rect>, parent: ReturnType<typeof rect>) =>
      child.left >= parent.left - 1 &&
      child.right <= parent.right + 1 &&
      child.top >= parent.top - 1 &&
      child.bottom <= parent.bottom + 1;

    const feedbackRect = rect(feedbackElement);
    const feedbackStyle = getComputedStyle(feedbackElement);
    const feedbackCanScrollVertically = ["auto", "scroll"].includes(
      feedbackStyle.overflowY,
    );
    const feedbackText = Array.from(
      feedbackElement.querySelectorAll<HTMLElement>("strong, span"),
    );
    const sections = Array.from(
      stageElement.querySelectorAll<HTMLElement>(
        game === "quiz"
          ? ":scope > .question-row, :scope > .choice-grid, :scope > .feedback"
          : ":scope > .picture-grid, :scope > .word-panel",
      ),
    ).map(rect);
    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>(".session-player button:not([disabled])"),
    )
      .filter((button) => rect(button).width > 0 && rect(button).height > 0)
      .map((button) => ({ label: button.getAttribute("aria-label") ?? button.textContent, ...rect(button) }));

    return {
      documentHorizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      feedbackClipsText:
        feedbackElement.scrollWidth > feedbackElement.clientWidth + 1 ||
        (feedbackElement.scrollHeight > feedbackElement.clientHeight + 1 &&
          !feedbackCanScrollVertically) ||
        feedbackText.some((node) => node.scrollWidth > node.clientWidth + 1),
      feedbackTextInsidePanel: feedbackText.every((node) => {
        const textRect = rect(node);
        return (
          textRect.left >= feedbackRect.left - 1 &&
          textRect.right <= feedbackRect.right + 1 &&
          (feedbackCanScrollVertically || inside(textRect, feedbackRect))
        );
      }),
      stageOverlapsDock: overlaps(rect(stageElement), rect(dock)),
      stageSectionsOverlap: sections.some((section, index) =>
        sections.slice(index + 1).some((other) => overlaps(section, other)),
      ),
      undersizedButtons: buttons.filter(({ width, height }) => width < 44 || height < 44),
    };
  }, gameId);

  expect(report).not.toBeNull();
  expect(report?.documentHorizontalOverflow).toBeLessThanOrEqual(1);
  expect(report?.feedbackClipsText).toBe(false);
  expect(report?.feedbackTextInsidePanel).toBe(true);
  expect(report?.stageOverlapsDock).toBe(false);
  expect(report?.stageSectionsOverlap).toBe(false);
  expect(report?.undersizedButtons).toEqual([]);
}

async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  if (testInfo.project.name !== "chromium") return;
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true });
}

async function lengthenRevealedFeedback(page: Page) {
  await page.locator(".feedback--revealed span").evaluate((node) => {
    const text = node.textContent?.trim() ?? "";
    node.textContent = [text, text, text, text].join(" ");
  });
}

test("long resolved content remains contained in both playable modes at every audit viewport", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  await startStudyFixture(page);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await showResolvedRecord(page, "quiz", "quiz-074");
    await assertSafeGameplayLayout(page, "quiz");
    await capture(page, testInfo, `quiz-${viewport.width}x${viewport.height}.png`);
    await lengthenRevealedFeedback(page);
    await assertSafeGameplayLayout(page, "quiz");

    await showResolvedRecord(page, "four-pics", "four-pics-moses");
    await assertSafeGameplayLayout(page, "four-pics");
    await capture(page, testInfo, `four-pics-${viewport.width}x${viewport.height}.png`);
    await lengthenRevealedFeedback(page);
    await assertSafeGameplayLayout(page, "four-pics");
  }
});

test("reported Four Pics explanations wrap inside their revealed answer panels", async ({
  page,
}, testInfo) => {
  await startStudyFixture(page);
  await page.setViewportSize({ width: 1920, height: 820 });

  for (const contentId of [
    "four-pics-rainbow",
    "four-pics-pearl",
    "four-pics-daniel",
    "four-pics-ark",
  ]) {
    await showResolvedRecord(page, "four-pics", contentId);
    await assertSafeGameplayLayout(page, "four-pics");
    await capture(page, testInfo, `${contentId}-1920x820.png`);
  }
});
