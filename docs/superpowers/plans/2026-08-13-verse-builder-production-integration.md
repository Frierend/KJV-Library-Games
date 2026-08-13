# Verse Builder Phase 12D–12H Production Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the frozen, human-reviewed 20-record Verse Builder starter pack into Quick Play and the existing session-v3 hosted-play platform without changing reviewed content or introducing a new architecture.

**Architecture:** Extend the existing `GameId`/registry/content-pack model with `"verse-builder"`, prepare deterministic hosted rounds with persisted canonical and shuffled segment IDs, and render both Quick Play and hosted rounds through the existing `VerseBuilderBoard` and session reducer. Quick Play owns only its setup/active-round shell; hosted play continues to use `ActiveSession`, v3 persistence, platform timer, expiry, and host-controlled scoring.

**Tech Stack:** React, TypeScript, React Router, Vitest, Testing Library, existing session reducer/storage, existing sequence engine, existing CSS and UI primitives.

## Global Constraints

- Use `"verse-builder"` as the production game ID.
- Use only the frozen, human-reviewed 20-record Verse Builder starter pack.
- Do not modify reviewed Scripture text, segmentation, IDs, difficulty rules, reviewer metadata, or source provenance.
- Quick Play supports 5 / 10 / 15 / 20 / Custom verse counts, difficulty filtering, and a 60-second default.
- Hosted Session remains on session schema v3; do not add a schema bump, timer, score store, persistence layer, turn-state system, or broad refactor.
- Restored rounds reconstruct from persisted canonical/shuffled segment IDs; reset and restoration do not rerandomize.
- Fellowship and Study are noncompetitive; Team and Individual use existing host-controlled scoring.
- Only a correct first complete submission is competitively point-eligible; later successful retries resolve without point eligibility.
- Do not modify or inspect `GameplayStage.tsx`; stop if it becomes necessary.
- Do not implement Phase 13 features or change Quiz/Four Pics except for narrowly necessary compatibility fixes.
- Do not commit automatically.

---

### Task 1: Register the frozen Verse Builder content and game identity

**Files:**
- Modify: `src/games/types.ts`
- Modify: `src/content/registry.ts`
- Modify: `src/content/contentPacks.ts`
- Modify: `src/games/registry.ts`
- Modify: `src/content/registry.test.ts`
- Modify: `src/content/verseBuilderStarterPack.test.ts` only if a registry assertion needs a shared import; do not alter fixtures or reviewed records.

**Interfaces:**
- Produces `GameId = "quiz" | "four-pics" | "verse-builder"`.
- Produces `verseBuilderContentRecords` and `getVerseBuilderRecord(id: string)` from the frozen starter pack.
- Produces a third `RegisteredGame` entry with content count 20 and lazy component loading.

- [ ] **Step 1: Write the failing registry tests**

  Add assertions that the built-in content pack contains all 20 frozen Verse Builder IDs, `getContentRecord()` returns a Verse Builder record, and `gameRegistry["verse-builder"]` exposes the expected title, count, capabilities, and lazy loader.

- [ ] **Step 2: Run the focused tests and verify the expected failure**

  Run:

  ```powershell
  npm test -- --run src/content/registry.test.ts
  ```

  Expected: failure because the registry and `GameId` do not yet include Verse Builder.

- [ ] **Step 3: Implement the minimum registration changes**

  Import `verseBuilderStarterPack` into `src/content/registry.ts`, append it to `allContentRecords`, add `getVerseBuilderRecord`, update the pack description/count through `allContentRecords`, add the `verse-builder` game registry entry, and update the registry type union. Keep `CONTENT_SCHEMA_VERSION`, `CONTENT_VERSION`, and every starter-pack record unchanged.

- [ ] **Step 4: Run the focused tests and verify green**

  Run the same command and confirm the registry/content tests pass.

---

### Task 2: Prepare deterministic Verse Builder hosted rounds and storage acceptance

**Files:**
- Create: `src/games/verse-builder/verseBuilderAdapter.ts`
- Create: `src/games/verse-builder/verseBuilderAdapter.test.ts`
- Modify: `src/session/presets.ts`
- Modify: `src/session/createSession.ts`
- Modify: `src/session/storage.ts`
- Modify: `src/session/storageMigrations.test.ts` only for Verse Builder-preservation coverage if needed.
- Modify: `src/session/storage.test.ts`

**Interfaces:**
- `prepareVerseBuilderRounds(roundCount: number, order: "random" | "source", random: () => number): PreparedVerseBuilderRound[]` selects only the frozen pack and stores each record’s canonical segment IDs plus one deterministic shuffled permutation.
- `createPlaylistItem("verse-builder", index, overrides)` defaults to 5 rounds and 60 seconds while preserving normal playlist overrides.

- [ ] **Step 1: Write failing adapter/session tests**

  Cover source-order selection, deterministic random selection, persisted canonical/shuffled IDs, the 20-record limit, the 60-second playlist default, and acceptance of a Verse Builder playlist item in `isSessionConfig`.

- [ ] **Step 2: Run the focused tests and verify the expected failure**

  Run:

  ```powershell
  npm test -- --run src/games/verse-builder/verseBuilderAdapter.test.ts src/session/storage.test.ts
  ```

  Expected: failure because no Verse Builder preparation path or storage acceptance exists.

- [ ] **Step 3: Implement the adapter and preparation branch**

  Use the existing seeded random stream and `prepareSequence` from `src/games/sequence/sequenceEngine.ts`. For each prepared round, persist `canonicalSegmentIds` and `shuffledSegmentIds`; never persist a newly generated random value as the source of restoration. Add the Verse Builder branch to `preparePlaylistItem` before the existing Four Pics fallback.

- [ ] **Step 4: Implement the minimum config validation change**

  Extend `isPlaylistItem` to accept only the exact third game ID while retaining the existing `kjventure-core`, count, order, timer, and expiry checks. Do not loosen validation for any other value.

- [ ] **Step 5: Run the focused tests and verify green**

  Run the adapter and storage test command again, then run the existing session creation/reducer tests that directly cover prepared rounds.

---

### Task 3: Make Verse Builder session state reconstructible and expiry-safe

**Files:**
- Modify: `src/session/reducer.ts`
- Modify: `src/session/storage.ts`
- Modify: `src/session/reducer.test.ts`
- Modify: `src/session/storage.test.ts`

**Interfaces:**
- Existing `PreparedVerseBuilderRound`, `VerseBuilderRoundState`, `VERSE_*` actions, and schema v3 remain the public persistence contract.

- [ ] **Step 1: Write failing regression tests**

  Add tests proving that auto-reveal changes a Verse Builder round to `revealed` with canonical segment IDs, reset restores an active empty arrangement without changing the persisted shuffled order, and restoration normalizes an in-progress Verse Builder round without losing its arrangement/attempt metadata.

- [ ] **Step 2: Run the focused reducer/storage tests and verify red**

  Run:

  ```powershell
  npm test -- --run src/session/reducer.test.ts src/session/storage.test.ts
  ```

  Expected: failure on the current Verse Builder auto-reveal/reset behavior.

- [ ] **Step 3: Apply localized reducer/storage fixes**

  When `TICK` reaches auto-reveal, set the Verse Builder arrangement to the prepared canonical IDs. Use the existing `RESET_ROUND` timer-reset path for hosted board reset; keep `VERSE_RESET` state-only if it is used by Quick Play. Ensure normalization preserves valid Verse Builder state fields and does not regenerate IDs.

- [ ] **Step 4: Run the focused tests and verify green**

  Re-run the reducer/storage tests and the existing v2→v3 migration tests. Confirm `SESSION_SCHEMA_VERSION` remains `3`.

---

### Task 4: Add Verse Builder Quick Play

**Files:**
- Create: `src/games/verse-builder/VerseBuilderGame.tsx`
- Create: `src/games/verse-builder/VerseBuilderGame.test.tsx`
- Modify: `src/app/AppRouter.tsx`
- Modify: `src/screens/ExploreGamesScreen.tsx`
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- `VerseBuilderGame` accepts the existing `{ onExit: () => void }` lazy-game prop.
- Quick Play uses local `AssemblyState`/`PreparedSequence` from the existing sequence engine and the frozen content records only.

- [ ] **Step 1: Write failing component tests**

  Cover the setup controls for 5/10/15/20/Custom, difficulty filtering, the 60-second default, starting a filtered pack, rendering reference/segments through `VerseBuilderBoard`, first-attempt eligibility, retry resolution without eligibility, and exiting to the library.

- [ ] **Step 2: Run the focused component test and verify red**

  Run:

  ```powershell
  npm test -- --run src/games/verse-builder/VerseBuilderGame.test.tsx
  ```

  Expected: module/component failure because Quick Play is not registered or routed.

- [ ] **Step 3: Implement the Quick Play shell**

  Provide setup state for count and difficulty (`all` plus the three existing difficulty values), prepare a deterministic local sequence per selected record, show the existing board with a 60-second countdown, and use the existing board callbacks for add/remove/move/reset/submit. Keep Fellowship-style Quick Play noncompetitive and use the board’s existing feedback semantics.

- [ ] **Step 4: Add the route and library card**

  Add `/games/verse-builder` to `AppRouter`, register the lazy component, and add the third Explore Games card with the 20-verse count. Update only stale library copy that says there are exactly two games.

- [ ] **Step 5: Run the focused component test and verify green**

  Re-run the test and inspect only the directly affected route/card behavior through focused Chromium later in Task 7.

---

### Task 5: Add Verse Builder to Session Studio

**Files:**
- Modify: `src/screens/SessionStudioScreen.tsx`
- Modify: `src/screens/SessionStudioScreen.test.tsx` if present; otherwise add focused assertions to the existing studio test file.

**Interfaces:**
- `newPlaylistItem` accepts all three `GameId` values.
- `contentNoun`, count labels, max rounds, and labels use `verse-builder` → `verses` and cap the count at 20.

- [ ] **Step 1: Write failing Studio tests**

  Cover adding Verse Builder to the playlist, showing 20 available verses, defaulting to 5 rounds/60 seconds, editing count/order/timer/expiry through existing controls, and starting a valid mixed session.

- [ ] **Step 2: Run the focused Studio test and verify red**

  Run:

  ```powershell
  npm test -- --run src/screens/SessionStudioScreen.test.tsx
  ```

  Expected: failure because the Studio only exposes Quiz and Four Pics.

- [ ] **Step 3: Implement the narrow Studio integration**

  Add the Verse Builder playlist button and route-aware labels/settings. Keep existing difficulty control behavior for Quiz/Four Pics unchanged; no new hosted difficulty filter is added unless the existing playlist type already supports it.

- [ ] **Step 4: Run the focused Studio test and verify green**

  Confirm existing mode-switch, presentation-setting, and scoring-roster tests remain green.

---

### Task 6: Render hosted Verse Builder rounds through the existing session platform

**Files:**
- Modify: `src/screens/PlaySessionScreen.tsx`
- Modify: `src/screens/PlaySessionScreen.test.tsx`
- Modify: `src/games/verse-builder/VerseBuilderBoard.tsx` only if a narrowly necessary prop/state compatibility fix is identified; preserve its reviewed accessibility behavior.

**Interfaces:**
- Add a hosted `VerseBuilderRound` adapter that maps `VerseBuilderRoundState` (`arrangedSegmentIds`, `attemptCount`, `firstSubmissionCorrect`) to the board’s `AssemblyState` and maps `AssemblySubmission` to `VERSE_*` reducer actions.
- Rebuild `PreparedSequence` from the current record’s segment text and persisted `canonicalSegmentIds`/`shuffledSegmentIds`; do not call `prepareSequence` for restored hosted rounds.

- [ ] **Step 1: Write failing hosted-play tests**

  Cover hosted Verse Builder rendering, add/move/remove/reset/submit dispatches, reference display modes, Team/Individual eligibility messaging, noncompetitive Fellowship/Study behavior, timer controls, allow-skip/require-reveal/auto-reveal behavior, and next/previous navigation.

- [ ] **Step 2: Run the focused hosted-play test and verify red**

  Run:

  ```powershell
  npm test -- --run src/screens/PlaySessionScreen.test.tsx
  ```

  Expected: failure because the play screen has no Verse Builder renderer or keyboard branch.

- [ ] **Step 3: Implement the hosted adapter and render branch**

  Add the Verse Builder branch to the preloader guard, keyboard handling, game name, and render selection. Pass `competitive={mode === "team" || mode === "individual"}`, derive `showReference` from the existing `referenceDisplay`, and dispatch only existing session actions. Use `RESET_ROUND` for board reset so the platform timer resets with the arrangement.

- [ ] **Step 4: Preserve scoring semantics**

  Keep score changes host-controlled through the existing scoring dock. Use `firstSubmissionCorrect` only to report eligibility; a later correct submission remains resolved but is not point-eligible. Do not add automatic score events.

- [ ] **Step 5: Run the focused hosted-play test and verify green**

  Re-run the PlaySession test and the existing Quiz/Four Pics, Team/Individual, presentation-settings, and accessibility tests.

---

### Task 7: Focused production verification and checkpoint handoff

**Files:**
- Modify only if a focused verification exposes an approved-scope defect.

- [ ] **Step 1: Run the focused unit/component set**

  Run the Verse Builder adapter/board/game tests, session creation/reducer/storage tests, registry tests, Session Studio tests, and PlaySession tests. Record exact pass/fail counts.

- [ ] **Step 2: Run focused Chromium flows**

  Verify directly affected flows only: Explore → Verse Builder Quick Play setup/start/submit/retry; Session Studio → mixed hosted session; Team and Individual eligibility messaging; Fellowship and Study noncompetitive behavior; timer expiry/reset; leave/restore; reference display; keyboard and responsive layout.

- [ ] **Step 3: Run the broader relevant regression and static checks**

  Run one relevant broader test command, typecheck, production build, and:

  ```powershell
  git diff --check
  git status --short
  ```

  Do not run an unrelated broad suite beyond the requested regression.

- [ ] **Step 4: Review the diff for protected-content safety**

  Confirm no starter-pack record or metadata changed, `GameplayStage.tsx` is absent from the diff and was never inspected, no schema bump or new persistence/timer/score architecture was introduced, and no Phase 13 work was added.

- [ ] **Step 5: Stop before Phase 13 and report the checkpoint**

  Report registration, Quick Play, Hosted Session, all four modes, eligibility, timer/expiry/reset, persistence/restoration, accessibility/responsive verification, exact test results, existing-game regression, files changed, protected-file confirmation, remaining risks, and recommended commit message. Do not commit.
