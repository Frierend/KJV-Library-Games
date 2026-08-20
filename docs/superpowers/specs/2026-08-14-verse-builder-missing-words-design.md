# KJVenture Verse Builder Evolution: Missing Words + Verse Order Design

**Status:** Approved planning design; implementation has not started  
**Baseline:** `feat/individual-play-scoring` at `5ef5b11600ffb7b49e05ced7ed689f0270550bf7`  
**Scope:** Evolve the single Verse Builder Library game into two internal play styles while preserving the reviewed content, Verse Order v1, and the platform session lifecycle.

## 1. Problem Statement

Verse Builder v1 correctly supports deterministic, accessible phrase-segment ordering, but manual use showed that ordering is not always the most natural Scripture-memory activity. The game will therefore offer two play styles under one Library identity:

- **Missing Words** is the default and recommended whole-verse recall experience. The canonical verse stays in normal reading order while one, two, or three meaningful words become inline text inputs.
- **Verse Order** is the existing phrase-segment Sequence/Assembly experience. It remains available without a rewrite.

The change must also contain the Verse Builder Library artwork inside its preview region. The current Verse Builder preview reuses `.quiz-preview`; its long word tiles can overflow their narrow grid cells at responsive card widths and visually collide with the adjacent card body. The fix belongs to the Verse Builder preview markup in `ExploreGamesScreen.tsx` and its preview rules in `styles.css`, not to a redesign of every `GameCard`.

## 2. Design Choices and Rejected Alternatives

### Selected: one game, two isolated interaction paths

`VerseBuilderGame` and the hosted Verse Builder branch choose a play style, then delegate to either `MissingWordsBoard` or the existing `VerseBuilderBoard`. Missing Words receives a new pure engine. Verse Order continues to use `sequenceEngine`, `VerseBuilderBoard`, prepared segment IDs, and arranged segment state.

This is preferred over teaching `sequenceEngine` about typed blanks because token selection and answer comparison are not sequence operations. It is also preferred over duplicating Verse Builder into two routes or Library cards because setup, content, reference, timer, round progression, and host controls are shared product concepts.

### Selected: persist prepared blank indices

Two restoration approaches were evaluated:

- **Option A — derive on every render/restoration:** compute blank indices from `verseId + difficulty`. This is the smallest runtime state, but an implementation change to the selector could alter an in-progress saved round after an application update.
- **Option B — prepare deterministically and persist:** compute from `verseId + difficulty` once when a hosted round is prepared and store `blankTokenIndices` on that prepared round. Rendering and reset reuse the stored indices.

Option B is selected. It follows the existing Verse Order precedent of persisting `shuffledSegmentIds`, guarantees exact restoration even if the selection algorithm is later refined, and stores only a small list of integer indices. Quick Play has no persisted session, so it may prepare deterministically when a round starts and retain the prepared object until navigation.

### Rejected: separate Library cards

Missing Words and Verse Order are not separate games. The Library retains one **Verse Builder** card and one `/games/verse-builder` route.

## 3. User Experience

### Library

The single card uses mechanic-neutral copy such as “Complete and arrange curated KJV verses to strengthen Scripture recall.” A dedicated `.verse-builder-preview` class visually represents Scripture building without naming either internal engine. Its bounds, overflow behavior, tile widths, and text wrapping keep all preview content inside `.game-card__preview` at desktop, tablet, portrait phone, and short-landscape card layouts.

### Setup

Both Quick Play and each Verse Builder Session Studio playlist item expose a compact **Play Style** choice:

`Missing Words` | `Verse Order`

Missing Words is initially selected for every newly created setup. It is marked recommended and described as completing words inside a whole verse. Verse Order is described as arranging phrase segments. No third style is introduced.

The setup retains Number of Verses, Difficulty, and Time Limit. Quick Play follows the existing option-button language and adds 30, 45, 60, and 90 second choices with 60 seconds selected by default. Hosted play retains the existing 5–300 second or No Time Limit controls and expiry behavior. Switching play styles preserves the round count, time, `missingWordsDifficulty`, and `verseOrderDifficulty` drafts independently.

Difficulty copy changes with the selected style:

- Missing Words: Introductory — 1 missing word; Intermediate — 2; Advanced — 3. Introductory is the new default.
- Verse Order: All difficulties, Introductory, Intermediate, and Advanced continue to filter the reviewed records by their existing assembly-complexity metadata.

Missing Words does not filter records by the v1 content difficulty. Its difficulty controls only blank count. Verse Order does not reinterpret content difficulty as blank count.

### Missing Words round

The round displays the citation first and the canonical verse as one readable, wrapping passage. Selected word text is replaced by fixed-width inline inputs; punctuation and whitespace remain in canonical positions. There is no Available Segments region, Your Verse region, Earlier/Later/Remove controls, drag-and-drop, or answer form below the passage.

The reference is always visible while solving, regardless of the global Bible Reference Display preference. This is a mode-specific memory prompt and does not modify `referenceDisplay` or the behavior of Quiz, Four Pics, or Verse Order.

The player fills all blanks and activates **Submit Answer**. Submission is disabled until every draft contains a non-whitespace answer, matching the project's existing disabled-action pattern while avoiding a surprise auto-submit. The timer continues after an incorrect submission. Correct and revealed states display `canonicalText` exactly and keep the reference visible.

## 4. Shared Types and Configuration

A focused `verseBuilderTypes.ts` module owns these names:

```ts
export type VerseBuilderPlayStyle = "missing-words" | "verse-order";
export type MissingWordsDifficulty = "introductory" | "intermediate" | "advanced";
export type VerseOrderDifficulty = "all" | VerseBuilderDifficulty;

export interface VerseBuilderSettings {
  playStyle: VerseBuilderPlayStyle;
  missingWordsDifficulty: MissingWordsDifficulty;
  verseOrderDifficulty: VerseOrderDifficulty;
}
```

`DEFAULT_VERSE_BUILDER_SETTINGS` is `{ playStyle: "missing-words", missingWordsDifficulty: "introductory", verseOrderDifficulty: "all" }`. `LEGACY_VERSE_BUILDER_SETTINGS` differs only by `playStyle: "verse-order"`.

`GamePlaylistItem` gains `verseBuilder?: VerseBuilderSettings`. New Verse Builder playlist items always write the default settings. The field remains optional solely so an existing schema-v3 snapshot created by Verse Builder v1 can restore. `resolveVerseBuilderSettings(value)` returns a fully validated copy and uses the legacy Verse Order settings only when the entire field is absent; malformed present values fail session validation rather than being silently rewritten.

Prepared and persisted Verse Builder state becomes a play-style union:

```ts
export interface PreparedVerseOrderRound extends PreparedRoundBase {
  gameId: "verse-builder";
  playStyle?: "verse-order"; // absent only in historical schema-v3 snapshots
  canonicalSegmentIds: readonly string[];
  shuffledSegmentIds: readonly string[];
}

export interface PreparedMissingWordsRound extends PreparedRoundBase {
  gameId: "verse-builder";
  playStyle: "missing-words";
  difficulty: MissingWordsDifficulty;
  blankTokenIndices: readonly number[];
}

export type PreparedVerseBuilderRound =
  | PreparedVerseOrderRound
  | PreparedMissingWordsRound;
```

```ts
export interface VerseOrderRoundState extends RoundStateBase {
  gameId: "verse-builder";
  playStyle?: "verse-order";
  arrangedSegmentIds: string[];
  attemptCount: number;
  firstSubmissionCorrect: boolean | null;
}

export interface MissingWordsRoundState extends RoundStateBase {
  gameId: "verse-builder";
  playStyle: "missing-words";
  drafts: string[];
  incorrectBlankIndexes: number[];
  attemptCount: number;
  firstSubmissionCorrect: boolean | null;
}
```

Blank indexes in `MissingWordsRoundState` are zero-based positions within the ordered `blankTokenIndices` list. Token indices remain in the prepared round. This prevents confusion between “blank 2” and canonical token index 17.

## 5. Pure Missing Words Engine

`missingWordsEngine.ts` contains no React, session reducer, timer, scoring, DOM, or network code. It exports:

```ts
export type VerseToken = VerseWordToken | VerseSeparatorToken;
export function tokenizeVerse(canonicalText: string): VerseToken[];
export function reconstructVerse(tokens: readonly VerseToken[]): string;
export function blankCountForDifficulty(difficulty: MissingWordsDifficulty): 1 | 2 | 3;
export function selectMissingWordTokenIndices(
  tokens: readonly VerseToken[],
  verseId: string,
  difficulty: MissingWordsDifficulty,
): number[];
export function isProtectedCaseToken(
  tokens: readonly VerseToken[],
  tokenIndex: number,
): boolean;
export function normalizeMissingWordAnswer(value: string): string;
export function matchesMissingWord(
  tokens: readonly VerseToken[],
  tokenIndex: number,
  draft: string,
): boolean;
export function evaluateMissingWordsSubmission(
  tokens: readonly VerseToken[],
  blankTokenIndices: readonly number[],
  drafts: readonly string[],
  attemptCount: number,
  firstSubmissionCorrect: boolean | null,
): MissingWordsSubmission;
```

### Tokenization

Each token has a zero-based canonical `index`. A `VerseWordToken` contains `leadingPunctuation`, `word`, `trailingPunctuation`, and `raw`; a `VerseSeparatorToken` contains exact `text`. Separator tokens cover whitespace and punctuation-only runs. The word pattern supports the reviewed corpus's ASCII KJV words and preserves internal apostrophes or hyphens if later reviewed content contains them. The engine never normalizes the stored verse.

`reconstructVerse(tokenizeVerse(text))` must equal `text` byte-for-byte for all 20 reviewed records. Rendering a blank keeps the word token's leading/trailing punctuation visible and replaces only `word` with an input. A resolved or revealed round renders the original `canonicalText`, not a normalized reconstruction.

### Meaningful candidates

Only word tokens containing letters are candidates. Candidate comparison uses a lower-cased normalized word, but rendering and matching retain canonical text. The exact stop-word set for the current reviewed corpus is:

```ts
[
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for",
  "from", "he", "him", "his", "i", "in", "is", "it", "me", "my",
  "neither", "of", "on", "or", "that", "the", "thee", "them", "they",
  "this", "thou", "thy", "to", "unto", "us", "we", "what", "which",
  "who", "with", "ye", "you", "your"
]
```

Meaning-changing qualifiers such as `not`, `all`, `only`, `every`, `shall`, and `should` intentionally remain eligible. The complete 20-record pack must have at least three usable candidates per verse under this list.

### Deterministic selection and spacing

Selection is deterministic and uses no runtime random source:

1. Build candidates in canonical word order after stop-word removal.
2. Prefer candidates whose case-insensitive word occurs once in the verse. Repeated occurrences are held as a fallback so the same displayed answer is not chosen twice when unique meaningful words suffice.
3. Assign each canonical word token a zero-based word ordinal that ignores preserved separator tokens, then create one, two, or three target anchors at the midpoint, thirds, or quarters of that word-ordinal range.
4. For each anchor, choose the nearest remaining candidate by word-ordinal distance that is not adjacent to a selected word ordinal. Break equal-distance ties with a stable 32-bit FNV-1a hash of `${verseId}:${difficulty}:${token.index}`.
5. If an anchor has no non-adjacent candidate, relax adjacency for that anchor. If unique candidates are exhausted, admit at most one occurrence from each repeated normalized-word group, using the same distance and hash ordering.
6. Return the selected canonical raw token indices in canonical order. Raw token indices are persistence/rendering identifiers only; anchor distance and adjacency are always calculated from word ordinals, never from raw token-index differences.

The selector must return exactly the requested count for every reviewed record. A descriptive exception for an unsupported external record with too few word candidates is acceptable because production only admits validated reviewed records and corpus-wide tests prove the invariant.

## 6. Answer Matching and Protected Capitalization

`normalizeMissingWordAnswer` applies Unicode NFKC, trims leading/trailing whitespace, and removes punctuation or symbol characters only from the beginning and end. It does not remove internal characters or correct spelling.

Ordinary tokens compare normalized values case-insensitively in English. Therefore `Beginning`, `beginning`, and `beginning,` can match canonical `beginning`. Synonyms, fuzzy spelling, modernized spelling, missing internal apostrophes, and extra words do not match.

Protected case is contextual and token-level. The engine scans canonical word-token sequences for this approved list:

- single tokens: `God`, `LORD`, `Lord`, `Jesus`, `Christ`, `Father`, `Son`, `Saviour`;
- phrases: `Jesus Christ`, `Lord Jesus`, `Lord Jesus Christ`, `Holy Ghost`, `Holy Spirit`.

Every token participating in a matched phrase is protected, including `Holy`, `Ghost`, and `Spirit`. A protected token compares the punctuation-trimmed answer to its canonical `word` with exact case. It does not become a multi-word input. Other capitalized words, including sentence-initial ordinary words, remain case-insensitive.

## 7. Submission and Feedback

`evaluateMissingWordsSubmission` returns:

```ts
export interface MissingWordsSubmission {
  outcome: "incomplete" | "incorrect" | "correct";
  incorrectBlankIndexes: number[];
  attemptCount: number;
  firstSubmissionCorrect: boolean | null;
}
```

An incomplete submission does not increment attempts. A complete submission increments `attemptCount`. The first complete submission fixes `firstSubmissionCorrect` to `true` or `false`; later attempts never overwrite it.

For partial failure, every draft is preserved. `incorrectBlankIndexes` identifies only wrong blanks. Correct inputs remain filled and unmarked. The board applies visible text/icon status and `aria-invalid="true"` to each incorrect input, announces which ordinal blanks need correction without announcing expected words, and focuses the first incorrect input. Editing an invalid input removes only that input's invalid marker. No expected word appears in the error text, accessible name, DOM helper copy, or data attribute.

On success, the board replaces the token/input rendering with the exact `canonicalText`, keeps the reference, and reports either `Correct!`, `Correct - eligible for +1.`, or `Correct after retry - no point eligibility.` according to mode and first-submission state.

## 8. Inline Board and Keyboard Behavior

`MissingWordsBoard` owns display, input focus, accessible feedback, and draft callbacks. Platform orchestration owns result, timer, reset, reveal, navigation, and session state.

The board uses a reading passage with `white-space: pre-wrap`, natural line wrapping, and inline native text inputs. Every blank uses the same responsive CSS width, independent of expected word length. Width does not change while typing. Inputs use at least a 44px touch height, `box-sizing: border-box`, and a viewport-aware maximum so the passage never creates horizontal overflow.

Inputs appear in canonical order, so browser-native Tab and Shift+Tab navigation requires no custom focus trap. Their accessible names are exactly shaped like `Missing word 1 of 3 in John 3:16`. Labels never include the expected word. After an incorrect submit, focus moves to the first wrong input; after Next, the existing round-heading focus remains authoritative.

Quick Play and hosted global keyboard listeners must ignore events whose target is an input, textarea, select, or contenteditable element. This prevents typing letters such as `r` from triggering Reveal and prevents Enter from bypassing the explicit Submit Answer button. Host shortcuts remain available when focus is outside text entry.

Reduced Motion adds no animated reordering or focus movement. Timer updates retain the existing timer component and do not create second-by-second live-region announcements.

## 9. Quick Play Orchestration

`VerseBuilderGame` remains the setup/play/complete orchestrator. It stores both difficulty selections so switching styles is lossless.

At Start:

- Missing Words shuffles the full reviewed record list, selects the requested count, tokenizes each current record, and prepares deterministic blank indices from record ID plus `missingWordsDifficulty`.
- Verse Order applies the existing `verseOrderDifficulty` content filter, shuffles selected records, and prepares the existing sequence.

Reset clears drafts, invalid indexes, attempts, and result, retains the current verse and prepared blank indices or sequence shuffle, and restarts the existing `useCountdown` timer. Reveal resolves through the same Quick Play result state, disqualifies competitive eligibility by producing `revealed`, and displays canonical text. Incorrect submissions keep the timer enabled. Success/reveal pauses through the existing `resolved` condition. No second countdown is added.

## 10. Hosted Session, Reducer, and Restoration

`createPlaylistItem("verse-builder", ...)` writes `DEFAULT_VERSE_BUILDER_SETTINGS`. Session Studio edits `item.verseBuilder` alongside the existing per-playlist fields and continues to use the current numeric draft/blur commit behavior. It must not reintroduce immediate clamping.

`prepareVerseBuilderRounds` accepts resolved settings. Missing Words preparation selects records, tokenizes canonical text, computes blank indices, and returns `PreparedMissingWordsRound`. Verse Order preparation retains `prepareSequence` and returns `PreparedVerseOrderRound`.

The reducer adds two style-specific actions:

```ts
| { type: "VERSE_MISSING_WORD_CHANGE"; blankIndex: number; value: string }
| { type: "VERSE_MISSING_WORD_SUBMIT"; incorrectBlankIndexes: number[] }
```

Draft changes are accepted only for an active Missing Words round and valid blank index. Editing an invalid draft removes only that blank ordinal from `incorrectBlankIndexes`. Submit is accepted only when every draft is non-empty, the timer is not expired, and every reported incorrect index is in range. The reducer increments attempts and sets first-submission correctness. Correct pauses the existing timer; incorrect does not. Existing `VERSE_ADD_SEGMENT`, `VERSE_REMOVE_SEGMENT`, `VERSE_MOVE_SEGMENT`, and `VERSE_SUBMIT` paths are gated to Verse Order and otherwise unchanged.

The current reducer action `{ type: "CLEAR_INCORRECT" }` remains the shared transient feedback transition: when the current result is `incorrect`, it changes only that result to `unchecked` for Verse Builder and preserves the rest of its round state. Missing Words therefore retains drafts and `incorrectBlankIndexes` across this transition; the style-specific `VERSE_MISSING_WORD_CHANGE` action performs the per-blank invalid-marker removal described above. No new global clear action is introduced.

`RESET_ROUND` calls the play-style-aware `initialRoundState`, retaining `PreparedMissingWordsRound.blankTokenIndices` and restarting `timerForRound`. `REVEAL` and auto-reveal set the platform result to `revealed`; the Missing Words board derives the canonical resolved display from content rather than persisting answer text. `NEXT`, `PREVIOUS`, final completion, scoring, and host controls remain shared.

Storage normalization changes transient Missing Words `incorrect` to `unchecked` on restore while preserving drafts, attempt metadata, invalid blank indexes, prepared difficulty, and prepared blank indices. The timer restores paused under the existing rule.

## 11. Session Schema v3 Decision

The session schema remains **v3**.

This is safe because:

- the playlist addition is optional for backward compatibility and validated when present;
- new prepared/state shapes have a `playStyle` discriminant;
- an absent Verse Builder settings field or absent prepared/state `playStyle` unambiguously identifies a historical v1 Verse Order session;
- historical segment IDs and arrangement fields remain valid and untouched;
- new Missing Words rounds persist all restoration-critical state, including blank indices;
- `contentVersion`, content schema version, and the frozen content records do not change.

No v3-to-v4 migration is needed. Tests must load a v1-style schema-v3 Verse Builder snapshot without `verseBuilder` or `playStyle` and prove it restores as Verse Order. Present but invalid new settings must be rejected rather than reinterpreted. If future work removes the legacy optional shape, that future breaking change would require a new session schema; this feature does not.

## 12. Scoring and Modes

The platform's `scoreEvents`, Scoreboard, standings, undo, and final results remain the only scoring authority. Missing Words never awards automatically and does not add an active player/team, turn queue, or score store.

For Team and Individual play:

- correct first complete submission: eligible for host-awarded +1;
- incorrect first complete submission: retries remain available, later success resolves but is not eligible;
- reveal, expiry, auto-reveal, or skip: not eligible.

Fellowship Mode is collaborative with unlimited retries, an always-visible reference, host reveal, and no eligibility copy. Study Mode remains noncompetitive and uses the existing no-time-limit behavior, unlimited retries, always-visible mode-specific reference, and canonical verse after success or reveal. Neither mode changes the global reference preference.

## 13. Verse Order Preservation

Verse Order continues to use:

- `sequenceEngine.ts` and its existing unit tests;
- `VerseBuilderBoard.tsx` and its accessible button interaction;
- reviewed `segments`, `canonicalSegmentIds`, and `shuffledSegmentIds`;
- reset without reshuffling;
- existing attempt and first-submission eligibility rules;
- existing reference-display semantics;
- existing persistence and restoration.

The Sequence/Assembly engine, content records, segment boundaries, and content validators do not need modifications for Missing Words.

## 14. Library Artwork Containment

The DOM/CSS owner is the Verse Builder `preview` passed by `ExploreGamesScreen` plus the `.quiz-preview` rules in `styles.css`; `GameCard` correctly separates `.game-card__preview` and `.game-card__body`.

The implementation gives Verse Builder dedicated preview markup/class rules with `min-width: 0`, bounded inline size, clipped internal overflow where needed, smaller responsive type, and `overflow-wrap: anywhere` on long word tiles. It may add defensive `min-width: 0` to `.game-card__preview`, but must not change shared card dimensions or visual language.

A Playwright bounding-box assertion checks that every Verse Builder preview descendant stays within the preview rectangle and that the preview rectangle does not overlap the title or description rectangles. The same test records Quiz and Four Pics geometry at representative one-column and two-column widths and proves they remain non-overlapping.

## 15. Accessibility and Responsive Behavior

Required accessibility behavior:

- keyboard-only completion with native Tab and Shift+Tab order;
- explicit Submit Answer; incomplete state is disabled and explained by concise visible copy;
- `aria-invalid` plus visible text/icon for wrong blanks;
- first wrong input focused after submit;
- no expected answer in accessible names, descriptions, status text, or hidden DOM;
- reference announced as ordinary prompt text, not repeated on each keystroke;
- reduced-motion stability and existing focus-visible treatment;
- at least 44×44px touch targets for Missing Words inline inputs, Submit Answer, and any other control introduced or directly modified by Missing Words;
- no new timer live region or per-second announcement.

Responsive verification covers 390×844, 844×390, 768×1024 tablet, 1366×768 laptop, and 1920×1080 projector/fullscreen. Fixtures cover one, two, and three blanks; the shortest and longest reviewed verses; punctuation adjacent to a blank; multi-line wrapping; partial incorrect; correct; reveal; audience scores present/absent; and the host dock.

Objective checks require document horizontal overflow of at most one CSS pixel, no blank input wider than the passage, no input width change after typing short and long drafts, no overlap between the Missing Words board and host dock, reachable Submit/Reveal/Reset controls, and no Missing Words input, Submit Answer button, or directly introduced/modified Missing Words control under 44×44 pixels. Unrelated existing host controls are outside this feature's redesign scope unless a directly affected regression is discovered; their established accessibility coverage remains authoritative.

## 16. Reviewed Content and Versioning

`src/data/verseBuilderStarterPack.ts` remains byte-for-byte unchanged. The 20 records, KJV wording, punctuation, citations, stable IDs, segment IDs/boundaries, provenance, reviewer `Frierend`, and review date `2026-08-13` are frozen.

`CONTENT_SCHEMA_VERSION`, `CONTENT_VERSION`, and `SESSION_SCHEMA_VERSION` remain unchanged. Missing Words derives gameplay from `canonicalText`; it does not add content fields or records.

## 17. Error Handling and Invariants

- A production record that cannot produce its requested blank count is a content/engine invariant failure caught by corpus-wide tests, not a reason to silently lower difficulty.
- A missing content record continues to use the existing null/error path; the engine does not fetch content.
- Malformed present Verse Builder settings fail `isSessionConfig`.
- Reducer actions with a mismatched style, out-of-range blank index, expired timer, or resolved round are ignored, matching existing reducer safety behavior.
- Incorrect feedback never discloses an expected word.
- Reveal remains available to the host and resolves through the existing lifecycle.

## 18. Scope Exclusions

This evolution does not include additional verses, changes to reviewed text, Emoji Bible, Worship & Music, Audience Screen, BroadcastChannel, participant phones, backend or cloud sync, multiplayer networking, hints, fuzzy correction, speech recognition, AI checking, drag-and-drop changes, Library category redesign, a new timer, automatic scoring, or a second session controller.

`src/components/gameplay/GameplayStage.tsx` is protected and is not read, modified, imported, directly tested, or required by this design.

## 19. Acceptance Criteria

1. The Library has exactly one Verse Builder card, with contained preview artwork at representative widths and no Quiz/Four Pics regression.
2. New Quick Play and hosted Verse Builder setups default to Missing Words and expose only Missing Words and Verse Order.
3. Missing Words renders the exact verse in normal order with 1/2/3 inline blanks for Introductory/Intermediate/Advanced and always shows the citation.
4. The same record and difficulty always select the same non-random positions; hosted preparation persists those positions across save, reload, reset, previous/next, reveal, and timer expiry.
5. Tokenization reconstructs every frozen canonical text exactly and preserves punctuation around blank inputs.
6. Meaningful candidates exclude the documented stop words, prefer unique words, avoid adjacent blanks where possible, and spread multiple blanks through the verse.
7. Ordinary matching ignores case, surrounding punctuation, and outer whitespace while retaining exact spelling; protected sacred tokens require exact canonical capitalization, including tokens inside protected phrases.
8. Incomplete answers do not submit. Partial incorrect answers preserve all drafts, identify only wrong blanks, focus the first wrong blank, and reveal no answer.
9. Correct and revealed rounds show exact canonical KJV text and reference and use existing timer/result navigation behavior.
10. Team/Individual first-attempt eligibility, Fellowship collaboration, Study no-time-limit behavior, manual scoring, standings, undo, and final results remain platform-owned.
11. Verse Order still uses the current Sequence/Assembly engine, board, segment data, prepared shuffle, restoration, and accessibility behavior.
12. Historical schema-v3 Verse Builder sessions without new fields restore as Verse Order; new Missing Words sessions restore exactly; no version constants change.
13. Keyboard, screen-reader, reduced-motion, touch, responsive, and projector checks pass without horizontal overflow, focus traps, answer leaks, or host-dock overlap.
14. Quiz and Four Pics Quick Play/Hosted flows, Presentation Settings, session restoration, and the separately committed natural numeric-input editing behavior remain green.

## 20. Safe Implementation Sequence

Before implementation, manually verify and commit the current Session Studio numeric-input fix as its own change. Keep `checkpoint/verse-builder-v1` untouched, create `feat/verse-builder-missing-words` from the preserved post-fix baseline, and execute the implementation plan with narrow TDD commits. This planning pass does not create that branch, stage files, commit, or modify production code.
