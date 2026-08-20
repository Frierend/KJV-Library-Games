# Verse Builder Missing Words Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve Verse Builder into a two-style Scripture recall game where Missing Words is the default typed-recall experience and the existing Verse Order remains available.

**Architecture:** Preserve the existing Verse Order Sequence/Assembly engine while introducing an isolated pure Missing Words engine for tokenization, deterministic blank selection, and answer evaluation. UI components own inline input/focus behavior while the existing KJVenture platform remains authoritative for sessions, timer, scoring, persistence, modes, and navigation.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Playwright, existing KJVenture session architecture.

## Global Constraints

- Planning baseline: branch `feat/individual-play-scoring`, HEAD `5ef5b11600ffb7b49e05ced7ed689f0270550bf7`.
- Preserve the existing dirty numeric-input files exactly while planning; manually verify and commit that fix separately before implementation.
- Keep `checkpoint/verse-builder-v1` untouched; implement on a fresh `feat/verse-builder-missing-words` branch after the numeric fix is safe.
- `src/components/gameplay/GameplayStage.tsx` is protected: never read, inspect, modify, import, directly test, or require it.
- Keep exactly one Library card/route named Verse Builder; Missing Words and Verse Order are internal play styles.
- Missing Words is the default/recommended style and always shows `Book Chapter:Verse` while solving; this is mode-specific and does not change global `ReferenceDisplay` behavior.
- Missing Words difficulty is exact: Introductory = 1 blank, Intermediate = 2, Advanced = 3. Verse Order retains its current assembly/content difficulty filter.
- Use a pure local deterministic meaningful-word algorithm; no AI/NLP, embeddings, runtime network calls, fuzzy spelling, synonyms, speech recognition, or answer services.
- Do not change `src/data/verseBuilderStarterPack.ts`, its 20 reviewed records, canonical KJV text, references, IDs, segments, provenance, reviewer `Frierend`, or review date `2026-08-13`.
- Ordinary matching ignores outer whitespace, surrounding punctuation, and capitalization but remains spelling-exact. Protected sacred tokens require canonical case, including tokens in approved multi-word sacred phrases.
- Partial incorrect submissions preserve drafts, identify each wrong blank, retain correct values, focus the first wrong blank, and never reveal expected words in visible or accessible copy.
- Correct/reveal/reset/expiry use the existing timer, `RoundResult`, reducer, `canAdvance`, scoring, and persistence lifecycle. No second timer, score store, active-player/team field, turn queue, or session controller.
- Team/Individual first complete correct submission may be host-awarded +1; retries/reveal/expiry/skip are not eligible. Fellowship and Study remain noncompetitive with unlimited retries; Study keeps no-time-limit behavior.
- Hosted v3 state persists prepared blank indices and drafts. Historical v3 Verse Builder snapshots without new fields restore as Verse Order. Do not bump session, content, or content-pack versions.
- Preserve Verse Order's Sequence/Assembly engine, board, reviewed segments, prepared shuffle, reset, restoration, eligibility, and accessibility behavior.
- Preserve the pending natural numeric-input editing fix; do not reintroduce immediate clamping.
- Inline inputs are fixed-width independent of answer length, naturally wrapping, touch-comfortable, and free of horizontal overflow. Use native Tab/Shift+Tab; no answer leaks in accessible labels; use `aria-invalid`, concise status text, reduced motion, and no per-second timer announcements.
- Require at least 44×44px touch targets only for Missing Words inline inputs, Submit Answer, and controls introduced or directly modified by Missing Words. Do not redesign unrelated existing host controls unless this work causes a directly affected regression; their prior accessibility tests remain authoritative.
- `VerseToken[]` preserves separators. Tests locate word-token indexes explicitly with a shared helper, and selector spacing/adjacency assertions use word ordinals rather than raw token-index differences. Production may persist and return canonical raw token indexes.
- Pure engine tests clearly label invented text as synthetic, where exact KJV provenance is irrelevant. Component, orchestration, reducer, and browser fixtures that represent Scripture load an actual reviewed record from `src/content/registry.ts`; never retype a verse with a contradictory reference.
- Verify 390x844, 844x390, 768x1024, 1366x768, and 1920x1080/projector layouts with 1/2/3 blanks, short/long verses, adjacent punctuation, wrapping, incorrect, resolved, reveal, and host dock states.
- During implementation use focused Chromium; at completion run representative Missing Words checks in Chromium, Firefox, and WebKit plus existing Quiz, Four Pics, Verse Order, scoring, restoration, presentation, and numeric-input regressions.
- The current `test:e2e` package script already embeds Chromium, Firefox, and WebKit selectors. All focused browser commands therefore use the installed Windows executable convention `npx.cmd playwright test <specs> --project=<engine>` so command-line projects cannot accumulate with script-level projects.
- Exclude additional verses, Emoji Bible, Worship & Music, Audience Screen, BroadcastChannel, participant phones, backend/cloud sync, multiplayer networking, hints, drag-and-drop changes, and Library category redesign.

## File Map

### Create

- `src/games/verse-builder/verseBuilderTypes.ts` — play-style/difficulty/settings types, defaults, legacy resolution, and type guards. Test in `verseBuilderTypes.test.ts`.
- `src/games/verse-builder/missing-words/missingWordsEngine.ts` — pure tokenizer, exact reconstruction, candidate selector, matching, sacred-case utility, and submission evaluator. Test in `missingWordsEngine.test.ts`.
- `src/games/verse-builder/missing-words/MissingWordsBoard.tsx` — inline verse/input rendering, focus, invalid state, accessible feedback, and explicit submit. Test in `MissingWordsBoard.test.tsx`.
- `tests/e2e/verse-builder-missing-words.spec.ts` — focused Quick Play/hosted/responsive Missing Words browser coverage.
- `tests/e2e/library-card-containment.spec.ts` — bounding-box regression for Verse Builder artwork and Quiz/Four Pics non-regression.

### Modify

- `src/session/types.ts`, `src/session/presets.ts`, `src/session/createSession.ts`, `src/session/reducer.ts`, `src/session/storage.ts` — additive v3-compatible playlist/prepared/state shapes, defaults, actions, lifecycle, validation, and restoration.
- `src/games/verse-builder/verseBuilderAdapter.ts` — settings-aware preparation; its existing test gains Missing Words/Verse Order cases.
- `src/games/verse-builder/VerseBuilderGame.tsx` and test — two-style Quick Play setup and orchestration.
- `src/screens/SessionStudioScreen.tsx` and test — playlist play-style/difficulty controls while preserving numeric drafts.
- `src/screens/PlaySessionScreen.tsx` and test — hosted style boundary, board wiring, mode-specific reference, and keyboard guard.
- `src/session/reducer.test.ts`, `src/session/storage.test.ts` — Missing Words reducer/restoration coverage.
- `src/games/registry.ts`, `src/screens/ExploreGamesScreen.tsx`, `src/styles.css` — neutral copy and narrow preview containment fix.
- `src/styles/session.css` — Missing Words passage/input/status/responsive rules.
- `tests/e2e/verse-builder-phase13.spec.ts` — explicit Verse Order selection so the v1 regression survives the new default.

### Preserve

- `src/components/gameplay/GameplayStage.tsx` — **PRESERVE / DO NOT READ OR MODIFY**; it is not a dependency.
- `src/data/verseBuilderStarterPack.ts`, content validators/tests, `src/games/sequence/sequenceEngine.ts`, sequence tests, `src/games/verse-builder/VerseBuilderBoard.tsx`, and its tests — reviewed content and Verse Order engine/board.
- `src/components/GameCard.tsx`, `src/session/storageMigrations.ts`, `src/session/storageMigrations.test.ts`, `src/hooks/useCountdown.ts`, `src/session/selectors.ts`, and `src/session/controller.tsx` — existing generic/platform owners.
- The current dirty `SessionStudioScreen` files and numeric-input plan until their separate fix commit; implementation edits occur only afterward.

## Preflight Before Task 1

Run:

```powershell
git -c safe.directory='C:/Users/MARYJANE S. ATILLO/OneDrive/Desktop/KJV Library Games' branch --show-current
git -c safe.directory='C:/Users/MARYJANE S. ATILLO/OneDrive/Desktop/KJV Library Games' rev-parse HEAD
git -c safe.directory='C:/Users/MARYJANE S. ATILLO/OneDrive/Desktop/KJV Library Games' status --short --branch
git -c safe.directory='C:/Users/MARYJANE S. ATILLO/OneDrive/Desktop/KJV Library Games' diff --stat
```

Expected: the three numeric-input paths are the only pre-existing dirty paths; planning documents are the only planning additions. Manually test and commit the numeric fix, then create `feat/verse-builder-missing-words`. Do not stage or commit during this planning pass.

## Task 1: Shared Types and Exact Verse Tokenizer

**Files:**

- Create: `src/games/verse-builder/verseBuilderTypes.ts`
- Create: `src/games/verse-builder/verseBuilderTypes.test.ts`
- Create: `src/games/verse-builder/missing-words/missingWordsEngine.ts`
- Create: `src/games/verse-builder/missing-words/missingWordsEngine.test.ts`
- Modify: `src/session/types.ts` only for the shared settings import/optional playlist field after the type tests are green.

**Interfaces:**

- `VerseBuilderPlayStyle = "missing-words" | "verse-order"`.
- `MissingWordsDifficulty = "introductory" | "intermediate" | "advanced"`.
- `VerseOrderDifficulty = "all" | VerseBuilderDifficulty`.
- `VerseBuilderSettings { playStyle; missingWordsDifficulty; verseOrderDifficulty }`.
- `DEFAULT_VERSE_BUILDER_SETTINGS`, `LEGACY_VERSE_BUILDER_SETTINGS`, and `resolveVerseBuilderSettings(value: unknown): VerseBuilderSettings`.
- `VerseToken = VerseWordToken | VerseSeparatorToken`, `tokenizeVerse`, `reconstructVerse`, and `blankCountForDifficulty`.

- [ ] **Step 1: Write failing tests**

```ts
function wordTokenIndex(tokens: readonly VerseToken[], word: string, occurrence = 0) {
  const matches = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind === "word" && token.word === word);
  const match = matches[occurrence];
  if (!match) throw new Error(`Missing word-token fixture: ${word} occurrence ${occurrence}`);
  return match.index;
}

function wordOrdinal(tokens: readonly VerseToken[], tokenIndex: number) {
  if (tokens[tokenIndex]?.kind !== "word") throw new Error(`Token ${tokenIndex} is not a word token`);
  return tokens.slice(0, tokenIndex).filter((token) => token.kind === "word").length;
}

it("defaults new settings to Missing Words and absent settings to legacy Verse Order", () => {
  expect(DEFAULT_VERSE_BUILDER_SETTINGS).toEqual({ playStyle: "missing-words", missingWordsDifficulty: "introductory", verseOrderDifficulty: "all" });
  expect(resolveVerseBuilderSettings(undefined)).toEqual(LEGACY_VERSE_BUILDER_SETTINGS);
  expect(() => resolveVerseBuilderSettings({ playStyle: "unknown" })).toThrow(/play style/i);
});

it("reconstructs punctuation and whitespace exactly", () => {
  // Synthetic tokenizer fixture; exact KJV provenance is irrelevant.
  const text = "Have not I commanded thee?  Be strong, and of a good courage;";
  const tokens = tokenizeVerse(text);
  expect(reconstructVerse(tokens)).toBe(text);
  expect(tokens.some((token) => token.kind === "separator" && token.text === "  ")).toBe(true);
  expect(tokens.find((token) => token.kind === "word" && token.word === "strong")?.trailingPunctuation).toBe(",");
});

it.each([["introductory", 1], ["intermediate", 2], ["advanced", 3]] as const)("maps %s to %s blank(s)", (difficulty, count) => {
  expect(blankCountForDifficulty(difficulty)).toBe(count);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/verseBuilderTypes.test.ts src/games/verse-builder/missing-words/missingWordsEngine.test.ts`

Expected: FAIL because the new modules and exports do not exist.

- [ ] **Step 3: Implement the minimum domain model and tokenizer**

Give every token a zero-based canonical raw index. Store exact `raw` text, `leadingPunctuation`, `word`, and `trailingPunctuation` on word tokens; store exact whitespace/punctuation-only runs on separator tokens. Use the reviewed ASCII KJV word pattern with internal apostrophe/hyphen support. Reconstruct by concatenating token pieces; never normalize stored text. Keep `wordTokenIndex` and `wordOrdinal` test-only; later tests reuse them instead of treating raw indexes as word ordinals. Resolve absent settings to legacy Verse Order and reject malformed present settings.

- [ ] **Step 4: Run the focused tests and verify pass**

Run the same Vitest command. Expected: PASS for settings defaults/legacy resolution, exact punctuation/whitespace reconstruction, and all difficulty counts.

- [ ] **Step 5: Run neighboring frozen-content tests**

Run: `npm.cmd test -- src/content/verseBuilder.test.ts src/content/verseBuilderStarterPack.test.ts`

Expected: PASS for the unchanged 20-record reviewed pack.

- [ ] **Step 6: Inspect the diff**

Run: `git diff --check`. Confirm no data file, Sequence file, or protected file is touched. Commit later as `feat: add Verse Builder play-style and token model`.

## Task 2: Meaningful Candidates and Deterministic Blank Selection

**Files:**

- Modify: `src/games/verse-builder/missing-words/missingWordsEngine.ts`
- Modify: `src/games/verse-builder/missing-words/missingWordsEngine.test.ts`

**Interfaces:**

- `MISSING_WORD_STOP_WORDS: ReadonlySet<string>` with the exact approved list: `a, an, and, are, as, at, be, but, by, for, from, he, him, his, i, in, is, it, me, my, neither, of, on, or, that, the, thee, them, they, this, thou, thy, to, unto, us, we, what, which, who, with, ye, you, your`.
- `selectMissingWordTokenIndices(tokens, verseId, difficulty): number[]`.

- [ ] **Step 1: Write failing selection tests**

The free-form strings in this pure-engine block are synthetic selection fixtures; exact KJV provenance is irrelevant and none is production content.

```ts
it("excludes filler words and punctuation-only tokens", () => {
  // Synthetic engine fixture: exactly three meaningful candidates.
  const tokens = tokenizeVerse("For God -- the LORD; and mercy.");
  const indices = selectMissingWordTokenIndices(tokens, "fixture", "advanced");
  expect(indices.every((index) => tokens[index]?.kind === "word")).toBe(true);
  const words = indices.map((index) => tokens[index].kind === "word" ? tokens[index].word.toLowerCase() : "separator");
  expect(words).toEqual(["god", "lord", "mercy"]);
});

it("is deterministic and changes count with difficulty", () => {
  // Synthetic engine fixture: deterministic selection/count behavior only.
  const tokens = tokenizeVerse("For God so loved the world, that he gave his only begotten Son.");
  expect(selectMissingWordTokenIndices(tokens, "john-3-16", "intermediate")).toEqual(
    selectMissingWordTokenIndices(tokens, "john-3-16", "intermediate"),
  );
  expect(selectMissingWordTokenIndices(tokens, "john-3-16", "introductory")).not.toEqual(
    selectMissingWordTokenIndices(tokens, "john-3-16", "advanced"),
  );
});

it("avoids adjacent and duplicate normalized words when candidates permit", () => {
  // Synthetic engine fixture: repeated candidates and word-ordinal spacing.
  const tokens = tokenizeVerse("Love mercy and love truth, and walk humbly with God.");
  const selected = selectMissingWordTokenIndices(tokens, "micah", "advanced");
  const selectedWordOrdinals = selected.map((index) => wordOrdinal(tokens, index));
  expect(selected).toHaveLength(3);
  expect(new Set(selected.map((index) => tokens[index].kind === "word" ? tokens[index].word.toLowerCase() : "")).size).toBe(3);
  expect(selectedWordOrdinals.some((ordinal, position) => position > 0 && ordinal - selectedWordOrdinals[position - 1] === 1)).toBe(false);
});

it("has three usable candidates in every frozen reviewed record", () => {
  for (const record of verseBuilderContentRecords) {
    expect(selectMissingWordTokenIndices(tokenizeVerse(record.canonicalText), record.id, "advanced"), record.reference).toHaveLength(3);
  }
});
```

- [ ] **Step 2: Run the focused file and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/missing-words/missingWordsEngine.test.ts`

Expected: FAIL because the stop-word constant and selector do not exist.

- [ ] **Step 3: Implement the selector**

Filter letter-bearing word tokens by the exact stop-word set and assign each word token its canonical word ordinal while retaining its raw token index. Prefer words whose normalized value occurs once, and choose one/two/three anchors at midpoint/thirds/quarters of the word-ordinal range. Measure anchor distance and adjacency with word ordinals; never infer either from raw token-index subtraction. Tie-break with a stable FNV-1a hash of `verseId:difficulty:token.index`. Relax adjacency only when necessary, then admit one occurrence from repeated groups only after unique candidates are exhausted. Return canonical raw token indexes in canonical order and throw a descriptive insufficient-candidate error.

- [ ] **Step 4: Run focused tests and verify pass**

Run the same command. Expected: PASS for filler/punctuation exclusion, exact 1/2/3 counts, repeat determinism, spacing, duplicate avoidance, and all 20 records.

- [ ] **Step 5: Run Sequence/content regressions**

Run: `npm.cmd test -- src/games/sequence/sequenceEngine.test.ts src/content/verseBuilderStarterPack.test.ts`

Expected: PASS with no Sequence or frozen-content changes.

- [ ] **Step 6: Inspect the diff**

Run: `git diff --check`; confirm the stop-word list lives in the engine, not in `verseBuilderStarterPack.ts`. Commit later as `feat: select deterministic meaningful Missing Words blanks`.

## Task 3: Ordinary Matching and Sacred Capitalization

**Files:**

- Modify: `src/games/verse-builder/missing-words/missingWordsEngine.ts`
- Modify: `src/games/verse-builder/missing-words/missingWordsEngine.test.ts`

**Interfaces:**

- `normalizeMissingWordAnswer(value: string): string`.
- `isProtectedCaseToken(tokens, tokenIndex): boolean`.
- `matchesMissingWord(tokens, tokenIndex, draft): boolean`.

- [ ] **Step 1: Write failing matching tests**

These free-form strings are synthetic matching fixtures; exact KJV provenance is irrelevant because the tests isolate normalization and protected-case rules.

```ts
it("ignores ordinary case, outer whitespace, and surrounding punctuation but not spelling", () => {
  // Synthetic engine fixture.
  const tokens = tokenizeVerse("In the beginning God created.");
  const index = wordTokenIndex(tokens, "beginning");
  expect(matchesMissingWord(tokens, index, "  BEGINNING, ")).toBe(true);
  expect(matchesMissingWord(tokens, index, "begining")).toBe(false);
  expect(matchesMissingWord(tokens, index, "beginning earth")).toBe(false);
});

it.each([["God", "God", true], ["God", "god", false], ["God", "GOD", false], ["LORD", "LORD", true], ["LORD", "Lord", false], ["Jesus", "jesus", false]] as const)("applies strict sacred case for %s", (expected, draft, result) => {
  const tokens = tokenizeVerse(expected);
  expect(matchesMissingWord(tokens, wordTokenIndex(tokens, expected), draft)).toBe(result);
});

it("protects every token in approved sacred phrases", () => {
  // Synthetic engine fixture containing two approved phrases and one single token.
  const tokens = tokenizeVerse("Jesus Christ, Holy Spirit, and the Lord.");
  expect(tokens.flatMap((token, index) => token.kind === "word" && isProtectedCaseToken(tokens, index) ? [token.word] : [])).toEqual(["Jesus", "Christ", "Holy", "Spirit", "Lord"]);
  expect(matchesMissingWord(tokens, wordTokenIndex(tokens, "Jesus"), "jesus")).toBe(false);
  expect(matchesMissingWord(tokens, wordTokenIndex(tokens, "Christ"), "christ")).toBe(false);
  expect(matchesMissingWord(tokens, wordTokenIndex(tokens, "Spirit"), "spirit")).toBe(false);
});
```

- [ ] **Step 2: Run matching tests and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/missing-words/missingWordsEngine.test.ts -t "ordinary|sacred|phrase"`

Expected: FAIL because normalization/protected detection/matching are absent.

- [ ] **Step 3: Implement matching**

Normalize with NFKC, trim, and strip only leading/trailing Unicode punctuation/symbols. Detect contiguous canonical word-token sequences for the approved sacred phrases; do not create multi-word inputs. Compare protected tokens exact-case and all other words with English case-folding. Do not add fuzzy correction, synonym acceptance, or KJV modernization.

- [ ] **Step 4: Run focused tests and verify pass**

Run the same command without `-t`. Expected: PASS for ordinary punctuation/case tolerance, strict spelling, every single sacred term, phrase participants, and ordinary sentence-initial words.

- [ ] **Step 5: Run content/type neighbors**

Run: `npm.cmd test -- src/content/verseBuilder.test.ts src/games/verse-builder/verseBuilderTypes.test.ts`

Expected: PASS without canonical text mutation.

- [ ] **Step 6: Inspect the diff**

Run: `git diff --check`; verify no expected word appears in an error constant or matching failure message. Commit later as `feat: enforce Missing Words answer matching rules`.

## Task 4: Submission Evaluation and Persistent Missing Words State

**Files:**

- Modify: `src/games/verse-builder/missing-words/missingWordsEngine.ts`
- Modify: `src/games/verse-builder/missing-words/missingWordsEngine.test.ts`
- Modify: `src/session/types.ts`

**Interfaces:**

- `MissingWordsSubmission { outcome: "incomplete" | "incorrect" | "correct"; incorrectBlankIndexes: number[]; attemptCount: number; firstSubmissionCorrect: boolean | null }`.
- `evaluateMissingWordsSubmission(tokens, blankTokenIndices, drafts, attemptCount, firstSubmissionCorrect): MissingWordsSubmission`.
- `MissingWordsRoundState { gameId: "verse-builder"; playStyle: "missing-words"; drafts: string[]; incorrectBlankIndexes: number[]; attemptCount: number; firstSubmissionCorrect: boolean | null }`.
- `PreparedMissingWordsRound { gameId: "verse-builder"; playStyle: "missing-words"; difficulty; blankTokenIndices }` and the legacy-compatible `PreparedVerseOrderRound` union.

- [ ] **Step 1: Write failing submission tests**

These free-form strings are synthetic submission-engine fixtures; exact KJV provenance is irrelevant. Every blank is nevertheless located through `wordTokenIndex` so separator preservation cannot invalidate the test.

```ts
it("does not count incomplete drafts", () => {
  const tokens = tokenizeVerse("In the beginning God created.");
  const blank = wordTokenIndex(tokens, "beginning");
  expect(evaluateMissingWordsSubmission(tokens, [blank], ["   "], 0, null)).toEqual({ outcome: "incomplete", incorrectBlankIndexes: [], attemptCount: 0, firstSubmissionCorrect: null });
});

it("preserves correct drafts and identifies only wrong blanks", () => {
  const tokens = tokenizeVerse("God created the earth.");
  const blanks = [wordTokenIndex(tokens, "God"), wordTokenIndex(tokens, "earth")];
  expect(evaluateMissingWordsSubmission(tokens, blanks, ["God", "wrong"], 0, null)).toMatchObject({ outcome: "incorrect", incorrectBlankIndexes: [1], attemptCount: 1, firstSubmissionCorrect: false });
});

it("retains first-submission eligibility across a retry", () => {
  const tokens = tokenizeVerse("God created the earth.");
  const blanks = [wordTokenIndex(tokens, "God"), wordTokenIndex(tokens, "earth")];
  expect(evaluateMissingWordsSubmission(tokens, blanks, ["God", "earth"], 0, null)).toMatchObject({ outcome: "correct", attemptCount: 1, firstSubmissionCorrect: true });
  expect(evaluateMissingWordsSubmission(tokens, blanks, ["God", "earth"], 1, false)).toMatchObject({ outcome: "correct", attemptCount: 2, firstSubmissionCorrect: false });
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/missing-words/missingWordsEngine.test.ts -t "incomplete|preserves|eligibility"`

Expected: FAIL because evaluation and the new persisted state types do not exist.

- [ ] **Step 3: Implement evaluation and state types**

Treat any blank draft with empty trimmed text as incomplete. Compare drafts in `blankTokenIndices` order, collect zero-based blank ordinals, increment attempts only for complete submissions, and set first-submission correctness with nullish coalescing. Add play-style discriminants without removing historical optional Verse Order fields.

- [ ] **Step 4: Run focused tests and verify pass**

Run the same command. Expected: PASS for incomplete, all-correct, partial-incorrect, retained drafts, attempt counts, and eligibility metadata.

- [ ] **Step 5: Run existing session tests**

Run: `npm.cmd test -- src/session/reducer.test.ts src/session/storage.test.ts`

Expected: existing Verse Order fixture tests remain green; compile errors must be fixed at explicit style boundaries.

- [ ] **Step 6: Inspect the diff**

Run: `git diff --check`; confirm state stores drafts/ordinals but no canonical answer strings. Commit later as `feat: add Missing Words submission state`.

## Task 5: Inline MissingWordsBoard Component

**Files:**

- Create: `src/games/verse-builder/missing-words/MissingWordsBoard.tsx`
- Create: `src/games/verse-builder/missing-words/MissingWordsBoard.test.tsx`
- Modify: `src/styles/session.css`

**Interfaces:**

```ts
export interface MissingWordsBoardProps {
  canonicalText: string;
  tokens: readonly VerseToken[];
  blankTokenIndices: readonly number[];
  drafts: readonly string[];
  incorrectBlankIndexes: readonly number[];
  competitive?: boolean;
  expiryBehavior?: ExpiryBehavior;
  motion?: MotionPreference;
  onDraftChange: (blankIndex: number, value: string) => void;
  onSubmit: () => void;
  reference: string;
  result: RoundResult;
}
```

The board owns rendering, draft callbacks, focus, and accessible feedback. It does not own a timer, reducer, score, session, or navigation.

Board tests import `getVerseBuilderRecord` from `src/content/registry.ts` and build all Scripture-facing props from the reviewed `verse-builder-genesis-1-1` record. The local test helper resolves blank words with an explicit word-token lookup; it never retypes canonical text or pairs Genesis text with a different citation.

- [ ] **Step 1: Write failing component tests**

```tsx
const GENESIS_1_1 = getVerseBuilderRecord("verse-builder-genesis-1-1");
if (!GENESIS_1_1) throw new Error("Reviewed Genesis 1:1 fixture is missing");

function boardWordTokenIndex(tokens: readonly VerseToken[], word: string, occurrence = 0) {
  const matches = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind === "word" && token.word === word);
  const match = matches[occurrence];
  if (!match) throw new Error(`Missing reviewed word-token fixture: ${word}`);
  return match.index;
}

function Harness({
  blankWords = ["God"],
  initialDrafts = blankWords.map(() => ""),
  incorrect = [],
  result = "unchecked",
}: {
  blankWords?: readonly string[];
  initialDrafts?: readonly string[];
  incorrect?: readonly number[];
  result?: RoundResult;
}) {
  const tokens = tokenizeVerse(GENESIS_1_1.canonicalText);
  const blankTokenIndices = blankWords.map((word) => boardWordTokenIndex(tokens, word));
  const [drafts, setDrafts] = useState([...initialDrafts]);
  return (
    <MissingWordsBoard
      canonicalText={GENESIS_1_1.canonicalText}
      tokens={tokens}
      blankTokenIndices={blankTokenIndices}
      drafts={drafts}
      incorrectBlankIndexes={incorrect}
      onDraftChange={(blankIndex, value) => setDrafts((current) => current.map((draft, index) => index === blankIndex ? value : draft))}
      onSubmit={vi.fn()}
      reference={GENESIS_1_1.reference}
      result={result}
    />
  );
}

it("renders inline inputs in canonical position without exposing answers", () => {
  render(<Harness blankWords={["beginning", "created"]} />);
  expect(screen.getAllByRole("textbox")).toHaveLength(2);
  expect(screen.getByRole("textbox", { name: `Missing word 1 of 2 in ${GENESIS_1_1.reference}` })).toBeVisible();
  expect(screen.getByText(GENESIS_1_1.reference)).toBeVisible();
  expect(screen.queryByText("beginning")).not.toBeInTheDocument();
  expect(screen.queryByText("created")).not.toBeInTheDocument();
});

it("uses a fixed-width input and disables incomplete submit", () => {
  render(<Harness blankWords={["beginning", "God", "created"]} />);
  expect(screen.getAllByRole("textbox")).toHaveLength(3);
  expect(screen.getByRole("button", { name: "Submit Answer" })).toBeDisabled();
  expect(screen.getAllByRole("textbox")[0]).toHaveClass("missing-words-input");
  expect(screen.getAllByRole("textbox")[0].getAttribute("aria-label")).not.toMatch(/beginning|God|created/i);
});

it("preserves correct drafts and focuses the first incorrect blank", () => {
  render(<Harness blankWords={["God", "earth"]} initialDrafts={["God", "wrong"]} incorrect={[1]} />);
  const inputs = screen.getAllByRole("textbox");
  expect(inputs[0]).toHaveValue("God");
  expect(inputs[1]).toHaveAttribute("aria-invalid", "true");
  expect(inputs[1]).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent(/blank 2/i);
  expect(screen.getByRole("status")).not.toHaveTextContent(/world|created/i);
});

it("renders canonical text and no inputs after resolution", () => {
  render(<Harness result="revealed" />);
  expect(screen.getByText(GENESIS_1_1.canonicalText)).toBeVisible();
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  expect(screen.getByText(GENESIS_1_1.reference)).toBeVisible();
});
```

- [ ] **Step 2: Run the board test and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/missing-words/MissingWordsBoard.test.tsx`

Expected: FAIL because the component and scoped styles do not exist.

- [ ] **Step 3: Implement the minimum board**

Render separator text exactly and replace only blank word content with native text inputs. Give each input `aria-label="Missing word {ordinal} of {total} in {reference}"`, set `aria-invalid` from `incorrectBlankIndexes`, and announce only blank ordinals in a polite live region. Focus the first invalid input when the invalid list changes. Use browser DOM order for Tab/Shift+Tab. Give the explicit submit control the scoped `.missing-words-submit` class. Render exact `canonicalText` for `correct`/`revealed`.

- [ ] **Step 4: Add scoped responsive styles and run tests**

Use `.missing-words-board`, `.missing-words-passage`, `.missing-words-input`, and `.missing-words-submit` selectors; set `white-space: pre-wrap`, `overflow-wrap: anywhere`, fixed input `inline-size: clamp(7rem, 18vw, 10rem)`, mobile max width, at least 44×44px for each input and Submit Answer, visible focus/invalid status, and reduced-motion behavior. Run the same Vitest command. Expected: PASS for reference visibility, inline order, no answer leak, disabled incomplete submit, invalid state/focus, canonical resolution, and the two directly introduced control types' minimum target sizes.

- [ ] **Step 5: Run Verse Order board regression**

Run: `npm.cmd test -- src/games/verse-builder/VerseBuilderBoard.test.tsx`

Expected: PASS unchanged; no segment controls are added to MissingWordsBoard and no Verse Order selectors are changed.

- [ ] **Step 6: Inspect the diff**

Run: `git diff --check`; confirm all new CSS is scoped to Missing Words. Commit later as `feat: add inline Missing Words board`.

## Task 6: Quick Play Play-Style Setup and Orchestration

**Files:**

- Modify: `src/games/verse-builder/VerseBuilderGame.tsx`
- Modify: `src/games/verse-builder/VerseBuilderGame.test.tsx`

**Interfaces:**

- Quick Play defaults to `playStyle: "missing-words"`, `missingWordsDifficulty: "introductory"`, `verseOrderDifficulty: "all"`, and 60 seconds.
- Setup exposes exactly `Missing Words` and `Verse Order`, plus 30/45/60/90 second choices and existing verse-count/custom controls.
- Missing Words preparation retains `{ record, tokens, blankTokenIndices }` across rerenders/reset; Verse Order retains its existing `PreparedSequence`.
- `VerseBuilderGameProps` accepts an optional `random?: () => number`, defaulting to `Math.random`, and passes it only to the existing record/sequence shuffle dependencies. Tests inject a deterministic function; Missing Words blank selection itself remains deterministic from record ID plus difficulty.

- [ ] **Step 1: Write failing setup/play tests**

```tsx
it("defaults to Missing Words and explains the blank counts", () => {
  render(<VerseBuilderGame onExit={vi.fn()} />);
  expect(screen.getByRole("button", { name: /Missing Words.*Recommended/i })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Verse Order" })).toBeInTheDocument();
  expect(screen.getByText(/Introductory.*1 missing word/i)).toBeVisible();
  expect(screen.getByText(/Intermediate.*2 missing words/i)).toBeVisible();
  expect(screen.getByText(/Advanced.*3 missing words/i)).toBeVisible();
});

it("starts Missing Words with inline blanks and a visible citation", () => {
  const deterministicRandom = () => 0;
  const expectedRecord = shuffle(verseBuilderContentRecords, deterministicRandom)[0];
  if (!expectedRecord) throw new Error("Reviewed Verse Builder pack is empty");
  render(<VerseBuilderGame onExit={vi.fn()} random={deterministicRandom} />);
  fireEvent.click(screen.getByRole("button", { name: "Start Verse Builder" }));
  expect(screen.getByRole("textbox", { name: `Missing word 1 of 1 in ${expectedRecord.reference}` })).toBeVisible();
  expect(screen.getByText(expectedRecord.reference)).toBeVisible();
  expect(screen.queryByText("Available Segments")).not.toBeInTheDocument();
});

it("switches to Verse Order without corrupting style-specific difficulty", () => {
  render(<VerseBuilderGame onExit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Verse Order" }));
  expect(screen.getByLabelText("Difficulty")).toHaveValue("all");
  fireEvent.click(screen.getByRole("button", { name: /Missing Words/ }));
  expect(screen.getByLabelText("Difficulty")).toHaveValue("introductory");
});
```

- [ ] **Step 2: Run Quick Play tests and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/VerseBuilderGame.test.tsx`

Expected: the existing Verse Order setup tests fail because the new style control/default and Missing Words board are absent.

- [ ] **Step 3: Implement the style boundary**

Keep `VerseBuilderGame` as the lifecycle owner. Add the optional `random` prop with a production default of `Math.random`, pass it to the existing shuffle calls, and inject `() => 0` in tests so the selected reviewed record is known. Store both difficulty choices, preserve count/custom validation, add duration choices, and use all reviewed records for Missing Words. Prepare Missing Words tokens/indices once per selected record; reset drafts/result without regenerating indices. Route explicit submit through the pure evaluator and retain drafts after incorrect. Render the existing `VerseBuilderBoard` only for Verse Order. Make global `R`, Enter, and arrow handlers return early for input/textarea/select/contenteditable targets so typing never reveals or submits unexpectedly.

- [ ] **Step 4: Run focused tests and verify pass**

Run the same Vitest command. Expected: PASS for default Missing Words, exactly two styles, style-aware difficulty, time selection, inline play, explicit submit, retry, reveal, reset, timer resolution, and existing Verse Order setup.

- [ ] **Step 5: Run neighboring Quick Play tests**

Run: `npm.cmd test -- src/games/quiz/QuizGame.test.tsx src/games/four-pics/FourPicsGame.test.tsx src/games/verse-builder/VerseBuilderBoard.test.tsx`

Expected: PASS; Quiz, Four Pics, and the untouched Verse Order board remain green.

- [ ] **Step 6: Inspect the diff**

Run: `git diff --check`; confirm Quick Play does not write session storage or score events. Commit later as `feat: make Missing Words the Verse Builder Quick Play default`.

## Task 7: Hosted Settings, Preparation, and Schema-v3 Compatibility

**Files:**

- Modify: `src/session/types.ts`, `src/session/presets.ts`, `src/session/createSession.ts`, `src/games/verse-builder/verseBuilderAdapter.ts`, `src/games/verse-builder/verseBuilderAdapter.test.ts`.
- Modify: `src/session/storage.ts`, `src/session/storage.test.ts`.
- Modify: `src/screens/SessionStudioScreen.tsx`, `src/screens/SessionStudioScreen.test.tsx` only after the numeric-input fix is separately committed.

**Interfaces:**

- New Verse Builder playlist items write `verseBuilder: DEFAULT_VERSE_BUILDER_SETTINGS`; absent settings resolve to legacy Verse Order.
- `prepareVerseBuilderRounds(count, order, settings, random)` returns `PreparedMissingWordsRound[]` or `PreparedVerseOrderRound[]`.
- `initialRoundState(round)` creates `drafts: Array(blankTokenIndices.length).fill("")` for Missing Words.
- `isSessionConfig` validates present settings but accepts absent settings for old v3 snapshots.
- Session Studio stores `missingWordsDifficulty` and `verseOrderDifficulty` separately and retains current numeric draft/blur behavior.

- [ ] **Step 1: Write failing adapter, storage, and Studio tests**

```ts
it("writes Missing Words defaults on new playlist items", () => {
  expect(createPlaylistItem("verse-builder", 0).verseBuilder).toEqual(DEFAULT_VERSE_BUILDER_SETTINGS);
});

it("prepares persisted blanks or the existing Sequence fields by style", () => {
  const missing = prepareVerseBuilderRounds(1, "source", DEFAULT_VERSE_BUILDER_SETTINGS, createSeededRandom("missing"));
  expect(missing[0]).toMatchObject({ gameId: "verse-builder", playStyle: "missing-words", difficulty: "introductory" });
  expect(missing[0].blankTokenIndices).toHaveLength(1);
  const order = prepareVerseBuilderRounds(1, "source", LEGACY_VERSE_BUILDER_SETTINGS, createSeededRandom("order"));
  expect(order[0]).toMatchObject({ gameId: "verse-builder", canonicalSegmentIds: expect.any(Array), shuffledSegmentIds: expect.any(Array) });
  expect("blankTokenIndices" in order[0]).toBe(false);
});

it("accepts a historical v3 item without the optional settings", () => {
  const item = createPlaylistItem("verse-builder", 0);
  delete (item as { verseBuilder?: unknown }).verseBuilder;
  expect(isSessionConfig({ ...defaultSessionConfig, playlist: [item] })).toBe(true);
  expect(resolveVerseBuilderSettings(undefined).playStyle).toBe("verse-order");
});
```

Add a Studio test that selects Missing Words/Advanced, temporarily clears the verse count input, asserts the input remains empty and Start Session is disabled, then enters `1`, starts, and asserts the stored playlist item contains the selected style/difficulty.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/verseBuilderAdapter.test.ts src/session/storage.test.ts src/screens/SessionStudioScreen.test.tsx`

Expected: FAIL because settings, style-aware preparation, and controls are absent.

- [ ] **Step 3: Implement additive settings/preparation/Studio controls**

Make `GamePlaylistItem.verseBuilder` optional, add defaults in `createPlaylistItem`, and pass resolved settings from `createSession`. Missing Words prepares the full reviewed pack, tokenizes canonical text, and persists blank indices; Verse Order filters existing content difficulty and persists its sequence shuffle. Do not change schema/content versions or the migration table. In Studio, add two play-style buttons, a style-specific Difficulty select, and style-aware available-count validation; preserve the current numeric draft state and study-mode `timerSeconds: null` mapping.

- [ ] **Step 4: Run focused tests and verify pass**

Run the same command. Expected: PASS for defaults, legacy fallback, 1/2/3 prepared blanks, deterministic positions, style-specific round limits, serialization, and empty/intermediate numeric editing.

- [ ] **Step 5: Run session neighbors**

Run: `npm.cmd test -- src/session/storageMigrations.test.ts src/session/reducer.test.ts src/session/scoring.test.ts`

Expected: PASS with `SESSION_SCHEMA_VERSION === 3`, unchanged migration snapshots, unchanged scoring, and old Verse Order fixtures constructing.

- [ ] **Step 6: Inspect the diff and dirty-file boundary**

Run `git diff --check` and `git status --short`. Verify the numeric-input files retain their original pre-task changes plus only the explicit style controls. Commit later as `feat: persist Verse Builder play-style settings under schema v3`.

## Task 8: Hosted Reducer, Board Integration, Modes, Timer, and Restoration

**Files:**

- Modify: `src/session/reducer.ts`, `src/session/reducer.test.ts`.
- Modify: `src/screens/PlaySessionScreen.tsx`, `src/screens/PlaySessionScreen.test.tsx`.
- Modify: `src/session/storage.ts`, `src/session/storage.test.ts`.

**Interfaces:**

- Actions: `{ type: "VERSE_MISSING_WORD_CHANGE"; blankIndex: number; value: string }` and `{ type: "VERSE_MISSING_WORD_SUBMIT"; incorrectBlankIndexes: number[] }`.
- Existing action: `{ type: "CLEAR_INCORRECT" }` is retained with its current reducer semantics. It changes a current `incorrect` result to `unchecked`; for Verse Builder it preserves every other round-state field. It is not a new Missing-Words action and is not renamed.
- Hosted Verse Builder branches on `round.playStyle ?? "verse-order"`; Missing Words uses `MissingWordsBoard`, Verse Order uses unchanged `VerseBuilderBoard`.
- Missing Words reference visibility is always true; Verse Order uses the current `ReferenceDisplay` calculation.
- Reducer/hosted tests use `missingWordsSession({ recordId, blankWords })`, which resolves the reviewed record through `getVerseBuilderRecord`, tokenizes its `canonicalText`, and maps each requested blank word through the explicit test-only `wordTokenIndex` helper.

- [ ] **Step 1: Write failing reducer/hosted tests**

```ts
it("retains drafts and identifies only wrong blanks after an incorrect submit", () => {
  let session = missingWordsSession({ recordId: "verse-builder-genesis-1-1", blankWords: ["God", "earth"] });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_CHANGE", blankIndex: 0, value: "God" });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_CHANGE", blankIndex: 1, value: "wrong" });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_SUBMIT", incorrectBlankIndexes: [1] });
  expect(currentRoundState(session)).toMatchObject({ result: "incorrect", drafts: ["God", "wrong"], incorrectBlankIndexes: [1], attemptCount: 1, firstSubmissionCorrect: false });
});

it("rejects an incomplete Missing Words submit without counting an attempt", () => {
  let session = missingWordsSession({ recordId: "verse-builder-genesis-1-1", blankWords: ["God", "earth"] });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_CHANGE", blankIndex: 0, value: "God" });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_CHANGE", blankIndex: 1, value: "   " });
  const next = sessionReducer(session, { type: "VERSE_MISSING_WORD_SUBMIT", incorrectBlankIndexes: [1] });
  expect(next).toBe(session);
  expect(currentRoundState(next)).toMatchObject({ result: "unchecked", drafts: ["God", "   "], incorrectBlankIndexes: [], attemptCount: 0, firstSubmissionCorrect: null });
});

it("uses the existing CLEAR_INCORRECT transition without erasing Missing Words feedback state", () => {
  let session = missingWordsSession({ recordId: "verse-builder-genesis-1-1", blankWords: ["God", "earth"] });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_CHANGE", blankIndex: 0, value: "God" });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_CHANGE", blankIndex: 1, value: "wrong" });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_SUBMIT", incorrectBlankIndexes: [1] });
  session = sessionReducer(session, { type: "CLEAR_INCORRECT" });
  expect(currentRoundState(session)).toMatchObject({ result: "unchecked", drafts: ["God", "wrong"], incorrectBlankIndexes: [1], attemptCount: 1, firstSubmissionCorrect: false });
  session = sessionReducer(session, { type: "VERSE_MISSING_WORD_CHANGE", blankIndex: 1, value: "earth" });
  expect(currentRoundState(session)).toMatchObject({ drafts: ["God", "earth"], incorrectBlankIndexes: [] });
});

it("resets drafts/timer but preserves prepared blank positions", () => {
  const fixture = missingWordsSession({ recordId: "verse-builder-genesis-1-1", blankWords: ["God", "earth"] });
  const session = sessionReducer(fixture, { type: "RESET_ROUND" });
  expect((currentRoundState(session) as MissingWordsRoundState).drafts).toEqual(["", ""]);
  expect((session.preparedRounds[0] as PreparedMissingWordsRound).blankTokenIndices).toEqual(
    (fixture.preparedRounds[0] as PreparedMissingWordsRound).blankTokenIndices,
  );
});

it("always shows the Missing Words reference and does not hijack input shortcuts", () => {
  const record = getVerseBuilderRecord("verse-builder-genesis-1-1");
  if (!record) throw new Error("Reviewed Genesis 1:1 fixture is missing");
  const session = missingWordsSession({ recordId: record.id, blankWords: ["God"] });
  renderHostedMissingWords({ session, referenceDisplay: "hidden" });
  const input = screen.getByRole("textbox", { name: `Missing word 1 of 1 in ${record.reference}` });
  expect(screen.getByText(record.reference)).toBeVisible();
  fireEvent.keyDown(input, { key: "r" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(screen.queryByText("Answer")).not.toBeInTheDocument();
});
```

The hosted test block must assert first-correct eligibility, retry ineligibility, Reveal, require-reveal/allow-skip/auto-reveal expiry, Fellowship/Study copy, restored drafts/indices, and Verse Order rendering.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm.cmd test -- src/session/reducer.test.ts src/screens/PlaySessionScreen.test.tsx src/session/storage.test.ts`

Expected: FAIL because the reducer has no Missing Words actions and hosted rendering assumes Sequence/Assembly.

- [ ] **Step 3: Implement the platform boundary**

Gate existing segment actions to Verse Order. For `VERSE_MISSING_WORD_CHANGE`, accept valid indexes only while the Missing Words round is unresolved, update that draft, filter only the edited blank ordinal from `incorrectBlankIndexes`, and preserve every other draft/invalid ordinal. `VERSE_MISSING_WORD_SUBMIT` returns the unchanged session when any current draft is empty after trimming; otherwise it applies the supplied validated wrong ordinals, increments attempts, fixes first-submission correctness, leaves the timer running on incorrect, and pauses only on correct. Preserve the existing `CLEAR_INCORRECT` case exactly: it changes `incorrect` to `unchecked` and, through the current Verse Builder fallback, retains drafts and `incorrectBlankIndexes`. Reveal/auto-reveal use the existing `revealed` and timer-pause paths. Reset reuses prepared indices. Do not add another global clearing action.

Wire `PlaySessionScreen` to tokenize the current record and render `MissingWordsBoard`; dispatch draft/submit callbacks; pass `competitive` only for Team/Individual; and return early from global keyboard handlers for text-entry targets. Keep Scoreboard, HostControlDock, navigation, final results, `canAdvance`, and score events unchanged.

- [ ] **Step 4: Run focused tests and verify pass**

Run the same command. Expected: PASS for partial invalid feedback, retained drafts, first-wrong focus, eligibility, retry, reference override, reveal, reset, expiry, restore, keyboard privacy, and no second timer/scoring store.

- [ ] **Step 5: Run neighboring game tests**

Run: `npm.cmd test -- src/games/quiz/QuizGame.test.tsx src/games/four-pics/FourPicsGame.test.tsx src/screens/PlaySessionScreen.test.tsx`

Expected: Quiz/Four Pics hosted flows and all existing Verse Order hosted tests remain green.

- [ ] **Step 6: Inspect the diff**

Run: `git diff --check`; verify no `activeTeamId`, `activePlayerId`, turn queue, score authority, or timer implementation was added. Commit later as `feat: integrate Missing Words into hosted sessions`.

## Task 9: Library Artwork Containment Fix

**Files:**

- Modify: `src/screens/ExploreGamesScreen.tsx`, `src/games/registry.ts`, `src/styles.css`.
- Create: `tests/e2e/library-card-containment.spec.ts`.

**Interfaces:**

- Keep exactly one Verse Builder card. Give its preview a dedicated `.verse-builder-preview` root; preserve `GameCard.tsx`.
- The E2E helper compares preview/artwork/title/description rectangles and records document overflow.

- [ ] **Step 1: Write the failing bounding-box test**

```ts
test("Verse Builder artwork stays inside its preview and clear of copy", async ({ page }) => {
  await page.goto("/games");
  for (const viewport of [{ width: 1366, height: 768 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const card = page.locator(".game-card").filter({ has: page.getByRole("heading", { name: "Verse Builder" }) });
    const report = await card.evaluate((element) => {
      const nodes = [".game-card__preview", ".verse-builder-preview", ".game-card__body h2", ".game-card__body p"].map((selector) => element.querySelector<HTMLElement>(selector)!);
      const rect = (node: Element) => { const value = node.getBoundingClientRect(); return { left: value.left, right: value.right, top: value.top, bottom: value.bottom }; };
      const [preview, artwork, title, description] = nodes.map(rect);
      const inside = (child: ReturnType<typeof rect>, parent: ReturnType<typeof rect>) => child.left >= parent.left - 1 && child.right <= parent.right + 1 && child.top >= parent.top - 1 && child.bottom <= parent.bottom + 1;
      const overlaps = (first: ReturnType<typeof rect>, second: ReturnType<typeof rect>) => first.left < second.right - 1 && first.right > second.left + 1 && first.top < second.bottom - 1 && first.bottom > second.top + 1;
      return { artworkInsidePreview: inside(artwork, preview), previewOverlapsTitle: overlaps(preview, title), previewOverlapsDescription: overlaps(preview, description), horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(report.artworkInsidePreview).toBe(true);
    expect(report.previewOverlapsTitle).toBe(false);
    expect(report.previewOverlapsDescription).toBe(false);
    expect(report.horizontalOverflow).toBeLessThanOrEqual(1);
  }
});
```

- [ ] **Step 2: Run it and verify failure**

Run: `npx.cmd playwright test tests/e2e/library-card-containment.spec.ts --project=chromium`.

Expected: FAIL because the existing Verse Builder preview reuses `.quiz-preview` long-word tiles without a dedicated bounded rule.

- [ ] **Step 3: Implement the narrow fix**

Change only the Verse Builder preview child markup and add dedicated rules with `min-width: 0`, `max-inline-size: 100%`, `overflow-wrap: anywhere`, bounded tile sizing, and internal overflow containment. Keep `.quiz-preview`, card dimensions, and shared visual language unchanged. Update the registry description to mechanic-neutral Scripture recall/building copy.

- [ ] **Step 4: Run it and verify pass**

Run the same Chromium command. Expected: PASS at all widths with artwork inside preview, no preview/copy overlap, and no document overflow.

- [ ] **Step 5: Run neighboring Library regression**

Run: `npx.cmd playwright test tests/e2e/content-layout-audit.spec.ts --project=chromium`.

Expected: PASS; Quiz and Four Pics card geometry remains unchanged.

- [ ] **Step 6: Inspect diff**

Run: `git diff --check`; confirm `GameCard.tsx` is untouched. Commit later as `fix: contain Verse Builder Library artwork`.

## Task 10: Accessibility, Responsive, and Projector Hardening

**Files:**

- Modify: `src/styles/session.css`, `src/games/verse-builder/missing-words/MissingWordsBoard.tsx`, `src/games/verse-builder/missing-words/MissingWordsBoard.test.tsx`, `tests/e2e/verse-builder-missing-words.spec.ts`.

**Interfaces:**

- Stable hooks: `.missing-words-board`, `.missing-words-passage`, `.missing-words-input`, `.missing-words-input--incorrect`, `.missing-words-feedback`, `.missing-words-submit`.
- E2E geometry checks overflow, input bounds/width stability, dock overlap, answer redaction, and at least 44×44px targets for the Play Style choices, Missing Words setup controls introduced/modified in Task 6, inline inputs, and Submit Answer. It does not impose a new size contract on unrelated host controls.

- [ ] **Step 1: Write failing accessibility/geometry tests**

```tsx
it("keeps accessible names answer-free", () => {
  render(<Harness blankWords={["beginning", "God", "created"]} />);
  expect(screen.getAllByRole("textbox").map((input) => input.getAttribute("aria-label"))).toEqual([
    `Missing word 1 of 3 in ${GENESIS_1_1.reference}`,
    `Missing word 2 of 3 in ${GENESIS_1_1.reference}`,
    `Missing word 3 of 3 in ${GENESIS_1_1.reference}`,
  ]);
  expect(screen.getAllByRole("textbox").every((input) => !/beginning|God|created/i.test(input.getAttribute("aria-label") ?? ""))).toBe(true);
});
```

Add a browser loop at 390x844, 844x390, 768x1024, 1366x768, and 1920x1080. On setup, assert the introduced/modified Play Style, Missing Words difficulty, and duration controls are at least 44×44px. Start a round and assert document overflow <= 1px, every input is inside the board and at least 44×44px, Submit Answer is at least 44×44px, and the board does not overlap `.host-control-dock`. Target those controls explicitly; do not scan or resize unrelated existing host controls.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/missing-words/MissingWordsBoard.test.tsx` and `npx.cmd playwright test tests/e2e/verse-builder-missing-words.spec.ts --project=chromium`.

Expected: failure where stable hooks, fixed widths, or complete responsive rules are absent.

- [ ] **Step 3: Implement hardening**

Use `white-space: pre-wrap`, `overflow-wrap: anywhere`, `min-inline-size: 0`, fixed input width independent of expected word, mobile max width, at least 44×44px sizing on the explicitly listed Missing Words controls, visible focus/invalid text/icon status, one principal page scroll, dock clearance at short landscape, and reduced-motion transitions. Add no timer live region or per-second announcement. Leave unrelated existing host-control dimensions unchanged unless a directly affected regression is proven.

- [ ] **Step 4: Run focused tests and verify pass**

Run both commands from Step 2. Expected: PASS for answer-free names, `aria-invalid`, no answer leak, natural wrapping, stable input widths, touch targets, no overflow, and no dock overlap.

- [ ] **Step 5: Run Verse Order responsive neighbor**

Run: `npx.cmd playwright test tests/e2e/verse-builder-phase13.spec.ts --project=chromium`.

Expected: existing Verse Order responsive and axe checks remain green.

- [ ] **Step 6: Inspect diff**

Run: `git diff --check`; verify expected words are absent from labels, descriptions, status copy, and DOM helper content. Commit later as `test: harden Missing Words accessibility and responsive layout`.

## Task 11: Verse Order Compatibility and Cross-Mode Regression

**Files:**

- Modify: `src/games/verse-builder/VerseBuilderGame.test.tsx`, `src/games/verse-builder/verseBuilderAdapter.test.ts`, `src/screens/PlaySessionScreen.test.tsx`, `src/session/reducer.test.ts`, `tests/e2e/verse-builder-phase13.spec.ts`.
- Preserve: `src/games/verse-builder/VerseBuilderBoard.tsx`, `src/games/sequence/sequenceEngine.ts`, and their tests.

**Interfaces:**

- An absent `playStyle` means Verse Order for historical v3 preparation, rendering, reset, restore, and reference semantics.
- Explicit `playStyle: "verse-order"` uses unchanged Sequence/Assembly interfaces and v1 result messages.

- [ ] **Step 1: Write failing explicit Verse Order tests**

```tsx
it("keeps Verse Order as the secondary segment board", () => {
  render(<VerseBuilderGame onExit={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Verse Order" }));
  fireEvent.click(screen.getByRole("button", { name: "Start Verse Builder" }));
  expect(screen.getByRole("button", { name: /Add segment 1 of/ })).toBeVisible();
  expect(screen.getByText("Available Segments")).toBeVisible();
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
});
```

Add hosted tests proving a v3 snapshot without `playStyle` renders `VerseBuilderBoard`, preserves `shuffledSegmentIds` after reset/reload, obeys global reference display, and retains first-submission eligibility. Add a cross-mode test proving Missing Words always shows its reference while Quiz/Four Pics still obey `referenceDisplay`.

- [ ] **Step 2: Run focused regressions and verify failure**

Run: `npm.cmd test -- src/games/verse-builder/VerseBuilderGame.test.tsx src/games/verse-builder/verseBuilderAdapter.test.ts src/screens/PlaySessionScreen.test.tsx src/session/reducer.test.ts`.

Expected: failures identify consumers that incorrectly assume every Verse Builder round has segment fields; do not weaken Sequence/Assembly tests.

- [ ] **Step 3: Implement only the compatibility branch**

Use `round.playStyle ?? "verse-order"` and `state.playStyle ?? "verse-order"` at the style boundary. Keep existing segment labels, actions, feedback, scoring, reset, and accessibility unchanged. Update the v1 E2E smoke to select Verse Order before ordering/retry/reveal/expiry/completion.

- [ ] **Step 4: Run focused tests and verify pass**

Run the same Vitest command. Expected: PASS for both styles, historical fallback, prepared shuffle persistence, reference semantics, and eligibility.

- [ ] **Step 5: Run v1 Chromium smoke**

Run: `npx.cmd playwright test tests/e2e/verse-builder-phase13.spec.ts --project=chromium`.

Expected: PASS for Quick Play/hosted Verse Order, timer, require-reveal expiry, reveal, finish, and responsive/axe checks.

- [ ] **Step 6: Inspect diff**

Run: `git diff --check`; verify no Sequence/Assembly or frozen-content file changed. Commit later as `test: lock Verse Order compatibility while adding Missing Words`.

## Task 12: Milestone Browser and Full Regression Verification

**Files:**

- Test: `tests/e2e/verse-builder-missing-words.spec.ts`, `tests/e2e/verse-builder-phase13.spec.ts`, `tests/e2e/library-card-containment.spec.ts`, and existing neighboring suites.
- Preserve: all production files and the separately committed numeric-input fix.

**Interfaces:** No new runtime interface; this task verifies the completed design against the acceptance matrix.

- [ ] **Step 1: Complete representative browser assertions**

The Missing Words E2E file must cover Introductory/Intermediate/Advanced counts, disabled incomplete submit, success, partial incorrect retention/focus, retry eligibility, reveal, reset retaining blank labels, always-visible reference with global Hidden, Fellowship/Study copy and timer behavior, hosted restoration, expiry/auto-reveal, next/previous/final results, answer-free accessible names, and the scoped 44×44px checks from Task 10. Do not add a blanket target-size audit for unrelated host controls.

- [ ] **Step 2: Run focused Chromium checks**

Run:

```powershell
npx.cmd playwright test tests/e2e/verse-builder-missing-words.spec.ts --project=chromium
npx.cmd playwright test tests/e2e/verse-builder-phase13.spec.ts --project=chromium
npx.cmd playwright test tests/e2e/library-card-containment.spec.ts --project=chromium
```

Expected: PASS for Missing Words, Verse Order, Library containment, responsive geometry, keyboard flow, and focused accessibility.

- [ ] **Step 3: Run representative Firefox and WebKit checks**

Run:

```powershell
npx.cmd playwright test tests/e2e/verse-builder-missing-words.spec.ts --project=firefox
npx.cmd playwright test tests/e2e/verse-builder-missing-words.spec.ts --project=webkit
```

Expected: PASS for representative Missing Words interaction in both engines; do not run the entire historical browser suite in every engine here.

- [ ] **Step 4: Run unit, typecheck, build, and neighboring regressions**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npx.cmd playwright test tests/e2e/accessibility.spec.ts tests/e2e/fullscreen-quick-play-accessibility.spec.ts tests/e2e/hosted-session-integrity.spec.ts tests/e2e/hosted-session-responsive.spec.ts --project=chromium
```

Expected: all Vitest tests pass; TypeScript has no errors; Vite build succeeds; Quiz/Four Pics Quick Play/Hosted, team/individual scoring, standings, undo, final results, session restoration, Presentation Settings, responsive host dock, and numeric setup editing remain green.

- [ ] **Step 5: Inspect final diff and invariants**

Run:

```powershell
git diff --check
git status --short
git diff --stat
rg -n "GameplayStage" docs/superpowers/plans/2026-08-14-verse-builder-missing-words.md docs/superpowers/specs/2026-08-14-verse-builder-missing-words-design.md
```

Expected: only intended feature files/documents are changed; `GameplayStage.tsx` is not modified or required; frozen content and Sequence files are unchanged; the original numeric-input diff remains intact.

- [ ] **Step 6: Use narrow implementation commits**

Recommended messages: `feat: add Verse Builder play-style and token model`; `feat: select deterministic meaningful Missing Words blanks`; `feat: enforce Missing Words answer matching rules`; `feat: add Missing Words submission state`; `feat: add inline Missing Words board`; `feat: make Missing Words the Verse Builder Quick Play default`; `feat: persist Verse Builder play-style settings under schema v3`; `feat: integrate Missing Words into hosted sessions`; `fix: contain Verse Builder Library artwork`; `test: harden Missing Words accessibility and responsive layout`; `test: lock Verse Order compatibility while adding Missing Words`. Do not create those commits during this planning pass.

## Plan Self-Review

### Spec coverage

| Requirement | Task(s) |
| --- | --- |
| Single card and artwork containment | 9, 12 |
| Missing Words default/style setup | 6, 7 |
| Verse Order preservation | 6, 11, preserved Sequence files |
| 1/2/3 blanks | 1, 2, 6, 7 |
| Tokenization/reconstruction | 1, 5 |
| Meaningful deterministic selection/spacing | 2, 7 |
| Ordinary/sacred matching | 3, 4 |
| Inline inputs/accessibility/responsive | 5, 8, 10 |
| Partial incorrect feedback | 4, 5, 8, 10 |
| Correct/reveal/reset/timer/expiry | 4, 6, 8, 12 |
| Modes/scoring | 8, 12 |
| v3 persistence/restoration | 7, 8, 11 |
| Quick/hosted browser verification | 6, 7, 8, 12 |
| Frozen content/version/protected file/exclusions | Global Constraints, 1, 7, 11, 12 |

### Placeholder scan

Every task names concrete files, interfaces, test behavior, command, expected result, diff inspection, and commit boundary; no deferred requirement is left unspecified.

### Type and architecture check

The same names are used throughout: `VerseBuilderPlayStyle`, `MissingWordsDifficulty`, `VerseOrderDifficulty`, `VerseBuilderSettings`, `PreparedMissingWordsRound`, `PreparedVerseOrderRound`, `MissingWordsRoundState`, `VerseToken`, `blankTokenIndices`, `drafts`, `incorrectBlankIndexes`, `VERSE_MISSING_WORD_CHANGE`, and `VERSE_MISSING_WORD_SUBMIT`. `CLEAR_INCORRECT` is explicitly the existing reducer action with its current `incorrect` to `unchecked` semantics, while `VERSE_MISSING_WORD_CHANGE` clears one edited invalid ordinal. Missing Words is pure-engine testable without React; board rendering owns no platform authority; the existing timer, score events, reducer, persistence, and navigation remain authoritative; no reviewed content/version changes; Verse Order remains isolated; and the protected file is not a dependency.

### Token-index correctness

Every test that targets a word resolves its canonical raw token index through `wordTokenIndex` (or the equivalent board/session helper). Candidate anchors, distance, adjacency, and spacing assertions use zero-based word ordinals that ignore separator tokens. No raw token-index difference is treated as word spacing.

### Determinism and fixture integrity

Quick Play accepts an injected random source and tests use `() => 0` to select a known reviewed record; no assertion accepts an uncontrolled set of possible references. Hosted fixtures choose a reviewed record ID directly. Synthetic pure-engine strings are labelled as synthetic, while board/session Scripture text and references come from `getVerseBuilderRecord` or `verseBuilderContentRecords`.

### Reducer submission contract

The reducer test suite distinguishes whitespace-incomplete submission (unchanged session, zero attempts) from a complete partial failure (`["God", "wrong"]`, only blank ordinal `1` invalid, drafts retained, attempt incremented, first-submission correctness fixed to `false`). It also locks the exact existing `CLEAR_INCORRECT` transition and edit-specific invalid-marker removal.

### Browser command and touch-target scope

Focused runs invoke `npx.cmd playwright test ... --project=<engine>` directly because the `test:e2e` package script already embeds all three project selectors. Chromium is used during Tasks 9–11; Task 12 adds representative Firefox and WebKit Missing Words runs. The new 44×44px assertions cover Missing Words inputs, Submit Answer, and setup controls introduced or modified for the feature, without redesigning unrelated host controls.
