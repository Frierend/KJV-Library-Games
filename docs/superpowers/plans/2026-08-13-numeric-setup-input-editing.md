# Numeric Setup Input Editing Implementation Plan

> **For agentic workers:** Execute this plan inline with the investigation and verification checkpoints below. The user explicitly requires the work to remain uncommitted.

**Goal:** Make numeric setup fields editable as temporary text drafts so clearing, invalid intermediate values, and natural multi-digit replacement do not snap back to defaults or minimums.

**Architecture:** Keep approved numeric defaults and the existing `SessionConfig` schema unchanged. Add local string drafts and range validation to `SessionStudioScreen`; commit a draft only when it is valid and the session is started or the field loses focus. Quick Play custom count inputs already use string drafts and will be covered by the audit/regression tests without changing their content or defaults.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, Playwright/in-app browser.

## Global Constraints

- Do not inspect or modify `GameplayStage.tsx`.
- Do not create or merge a PR; leave all changes uncommitted.
- Do not change approved limits/defaults, session schema, or reviewed Verse Builder content.
- Do not redesign setup screens or add unrelated features.
- Preserve blank/invalid drafts, show inline range validation, and block/prevent Start while numeric setup is invalid.

### Task 1: Confirm the defect and affected paths

**Files:**
- Inspect only: `src/screens/SessionStudioScreen.tsx`, `src/screens/SessionStudioScreen.test.tsx`, `src/games/quiz/QuizGame.tsx`, `src/games/four-pics/FourPicsGame.tsx`, `src/games/verse-builder/VerseBuilderGame.tsx`, and relevant test/config files.

- [ ] Reproduce the Session Studio number and time fields with the browser and record the snap-back values.
- [ ] Trace Quick Play custom count fields and confirm they already preserve `event.target.value` as a string draft.
- [ ] Confirm the direct cause is numeric controlled state updated with immediate `Number(...)`, fallback, and clamping in Session Studio.

### Task 2: Add the smallest failing regression test

**Files:**
- Modify: `src/screens/SessionStudioScreen.test.tsx`

- [ ] Add a test using the real `SessionStudioScreen` that starts with the default Quiz count and time values, clears a count field, asserts it remains blank, enters a valid multi-digit replacement, and verifies Start is blocked while blank/invalid and allowed again after a valid replacement.
- [ ] Extend the same representative test to cover the time draft and the Session Studio range error without duplicating equivalent game-specific tests.
- [ ] Run the focused test before production edits and confirm it fails because the current controlled inputs snap back.

### Task 3: Implement the minimal draft/validation fix

**Files:**
- Modify: `src/screens/SessionStudioScreen.tsx`

- [ ] Add local per-playlist-item string drafts for round count and time limit, initialized from the existing numeric config values.
- [ ] Make `onChange` store the raw input string without clamping or replacing it.
- [ ] Validate blank, non-integer, low, and high drafts against the existing per-game count limits and the existing 5–300 second time range.
- [ ] Show the validation message beside the affected input, mark it invalid, and include numeric validation in the existing Start/Save blocking error path.
- [ ] Commit only valid draft values when appropriate for session start/field blur, while retaining the original defaults on initial load and keeping `GamePlaylistItem` numeric.
- [ ] Reset drafts when applying presets or toggling No Time Limit so stale drafts cannot override approved preset/default values.

### Task 4: Verify in layers

**Files:**
- No further production files expected.

- [ ] Run the focused Session Studio test, then all Vitest regression tests.
- [ ] Run typecheck, build, and `git diff --check`.
- [ ] Browser-verify Quiz, Four Pics, Verse Builder, and Session Studio setup fields, including clearing/replacing 5→10 and 20→15, blank time, invalid low/high values, boundaries, defaults, arrow keys, and responsive layout.
- [ ] Review the final diff and confirm `GameplayStage.tsx` is untouched and no commit/PR was created.
