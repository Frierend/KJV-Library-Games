# KJVenture Phase 11: Verse Builder Design

**Status:** Design only
**Baseline:** `feat/individual-play-scoring` at `9c556e6`
**Scope:** No implementation, registry changes, routes, datasets, or assets

This design was based on the minimum relevant repository surfaces: the game and content registries, Quick Play game boundaries, `ActiveSession` preparation and reducer flow, scoring, timer, persistence, Session Studio, hosted play, accessibility conventions, responsive session styles, and the existing content audit. Protected implementation surfaces were excluded from inspection.

## 1. Official Game Name

**Verse Builder** is the one recommended title.

- **Library description:** Rebuild a KJV verse by arranging its segments in the correct order.
- **Host explanation:** The host or player taps the verse segments into order, submits the arrangement, and reveals the complete verse when ready.
- **Category:** Scripture Learning.
- **Primary learning objective:** Reinforce exact KJV wording, sequence, and Bible-reference recall through active reconstruction.

“Verse Builder” is shorter and friendlier for children and adults than “Verse Ordering,” while the description makes the ordering mechanic explicit.

## 2. Game Purpose

Verse Builder is a host-led Scripture recall activity for fellowships, Sunday schools, classrooms, families, and individual practice. It should reward careful attention to the exact order and punctuation of a KJV verse without turning Bible learning into a speed-only contest.

## 3. Core Gameplay

A round presents one verse as shuffled, meaningful phrase chunks. The player or team moves every chunk into a proposed verse order, then explicitly submits the arrangement.

The v1 default is **curated phrase/chunk ordering**:

- Normally 4-10 chunks; validation permits 3-12.
- A chunk is usually 1-5 words and follows a natural phrase, clause, or punctuation boundary.
- Chunks preserve their original punctuation and capitalization.
- Each chunk has a stable identity even when two chunks display identical text.
- Word-by-word ordering is not the default because dozens of tiny movable items are poor on phones, difficult to scan on projectors, and unnecessarily noisy for accessibility.
- Fully automatic or difficulty-dependent segmentation is deferred. Phrase boundaries require human judgment, especially around semicolons, quotation marks, repeated wording, and long clauses.

This gives the game meaningful ordering practice while keeping the board readable and the engine reusable.

## 4. Round Lifecycle

1. **Prepare:** The platform selects a content record, stores its seeded shuffled chunk IDs, and creates an empty arrangement.
2. **Start:** The reference is shown only according to the existing Bible Reference Display setting. The prompt says to build the verse; the canonical verse is not shown before solving unless the host intentionally chose Always Show reference, which exposes only the citation, not the verse text.
3. **Assemble:** Available chunks are shown in a bank. Selecting one appends it to the answer area. The player can reorder or remove chunks.
4. **Submit:** Submit Answer is enabled only when every chunk is in the answer area. The engine compares stable IDs with the canonical order.
5. **Correct:** The timer pauses, the result becomes correct, the complete KJV verse is shown, and Next becomes available.
6. **Incorrect:** The attempt count increases, concise “Try again” feedback is shown, and the arrangement remains editable. The timer continues. The transient incorrect state returns to active assembly using the existing delayed-clear pattern.
7. **Reveal:** Reveal Answer replaces the answer arrangement with the canonical stable order, shows the complete verse, and pauses the timer. It does not animate a large reordering.
8. **Expire:** The existing platform expiry policy applies. Require reveal freezes the round until reveal; Allow Skipping permits Next without a point; Auto-reveal shows the canonical order immediately.
9. **Next:** The platform advances only when its existing `canAdvance` rule permits it. Reset Round restores the same prepared shuffle, clears assembly state, and restarts the platform timer.

The host remains responsible for the next action and any manual score award. Verse Builder does not bypass the session reducer.

## 5. Interaction Model

The primary interaction is a two-region button interface:

- **Available Segments:** Tap or click a segment to append it to the answer.
- **Your Verse:** The selected segments appear in order. Each row exposes Move Earlier, Move Later, and Remove controls. Reset returns all segments to Available.
- **Submit Answer:** Explicitly evaluates a complete arrangement.

Drag-and-drop is not required for v1. If a later convenience drag interaction is added, it must call the same engine operations and never be the only way to assemble or reorder.

Mouse and touch use the same native buttons. Keyboard users tab to a segment or control and activate it with Enter or Space. Moving a segment keeps focus on that segment; removing it moves focus to the nearest remaining answer item or its former available button.

Explicit submission is preferred to automatic checking. It prevents accidental completion on touch, gives teams a clear host-controlled moment, and matches the existing Four Pics “Check Answer” pattern.

## 6. Content Format

The proposed Verse Builder content record extends the existing Bible-content metadata and requires these fields:

| Field | Requirement |
| --- | --- |
| `id` | Stable unique ID, never derived from mutable verse text. |
| `schemaVersion` | Supported content schema version. |
| `reference` / `referenceText` | Matching canonical KJV citation; v1 starter records should prefer one verse rather than a passage range. |
| `canonicalText` | Exact approved KJV verse text, including case and punctuation. |
| `segments` | Ordered curated segment records. Each has a stable unique segment ID and non-empty display text. |
| `difficulty` | Required `introductory`, `intermediate`, or `advanced` label derived from the deterministic rules below. |
| `themeIds` / `contentPackIds` | Existing pack and theme metadata. |
| `validation` | Existing review status, reviewer, date, and source note. |

The authoritative join rule is normalized whitespace only: trimming each segment and joining segments with one space must reproduce the normalized `canonicalText` exactly. Punctuation remains in the segment text; it is not regenerated by the engine.

Segmentation is manually curated. An authoring tool may suggest whitespace-based defaults later, but generated output is never authoritative and every committed segment set must be independently reviewed. This is safer than producing dozens of near-identical, punctuation-sensitive tokens automatically.

## 7. Content Source Policy

Phase 9’s policy remains authoritative. Verse Builder content must come from either:

1. an approved project-provided KJV dataset; or
2. a verified public-domain KJV source, with the exact edition and source version recorded; or
3. a small manually curated starter set independently checked against an approved source.

The existing content audit identifies the 1769 King James / Authorized Version distributed by eBible.org/CrossWire as the reviewed authority, with an external corpus hash recorded in `docs/content-audit-2026-08-03.md`. The next phase must not populate a large verse bank from model memory or download content as part of implementation.

Every Verse Builder record should carry a source note identifying the edition, locator, review date, and source version or hash. A reviewer must verify exact verse text, reference, punctuation, and segment reconstruction. New records begin as unreviewed or legacy-imported until that check is complete.

## 8. Initial Content Size

The recommended initial target is **20 reviewed verses**.

Twenty is large enough for a useful Quick Play library and small enough to manually verify exact KJV text, curate phrase boundaries, test repeated wording, and exercise all difficulty bands. Quality matters more than reaching the existing Quiz count of 100.

## 9. Difficulty

Difficulty is supported, but it is deterministic rather than an arbitrary editorial label. The validator derives a score from the canonical text and curated segmentation:

- Word-count band: 0 points for 6-12 words, 1 for 13-20, 2 for 21-36.
- Segment-count band: 0 points for 3-5 segments, 1 for 6-8, 2 for 9-12.
- Repetition penalty: 1 point when two or more distinct segments have the same normalized display text.

The label is then:

- **Introductory:** score 0-1.
- **Intermediate:** score 2-3.
- **Advanced:** score 4-5.

V1 content should stay within 6-36 words and 3-12 segments. Very short verses that cannot form at least three meaningful chunks, and long verses that require an unreadable token bank, are not suitable starter records. Reference visibility is not silently folded into difficulty: Always Show is an intentional host clue, and scoring does not change when the host changes it.

## 10. Hints

**No hints in v1.**

Reveal Answer already provides a clear learning path. A hint such as placing the first chunk would require decisions about attempt counts, fairness, scoring, persistence, and audience disclosure. Deferring hints keeps the reusable engine small and makes competitive rounds predictable.

## 11. Timer

Verse Builder uses the existing platform timer and expiry behavior. It does not create a game-specific timer store.

- Hosted default: **45 seconds** per round, reflecting assembly time rather than multiple-choice response time.
- Existing configuration remains available: 5-300 seconds or No Time Limit.
- Default expiry behavior: **Require reveal**, preserving host control and preventing an unresolved round from silently advancing.
- Allow Skipping and Auto-reveal remain available through the existing session setting.
- Study Mode continues to force No Time Limit through the existing Session Studio behavior.
- Correct and revealed rounds pause the timer; incorrect submissions do not.
- Restored sessions follow the existing rule that timers are paused and do not deduct closed time.

Quick Play can use the existing standalone countdown pattern with a Verse Builder-specific default of 45 seconds; the reusable assembly engine remains timer-agnostic.

## 12. Scoring

Scoring stays in platform-owned `scoreEvents` and uses the existing manual host controls.

- Correct on any attempt: host may award **+1** to the active player or team.
- Incorrect attempts: 0 points and no penalty.
- Revealed, expired, or skipped rounds: 0 points.
- No time bonus, attempt multiplier, or game-specific score store.
- Fellowship and Study remain noncompetitive unless the platform’s existing mode configuration explicitly supplies competitors; v1 should not add new scoring behavior for them.

Fixed scoring is easier to explain, fairer for slower readers and accessibility users, and consistent with the current host-driven +1/-1 scoring model. The game result tells the host what happened; the host decides whom to credit.

## 13. Team Play

Team Play uses the shared host screen; it does not assume participant phones.

One designated team solves each round. Team members discuss the order aloud while the host operates the Available and Your Verse controls, or hands the shared keyboard/touch device to the team. The host submits when the team agrees, reveals when required, and manually awards +1 to that team on a correct result.

Team rotation is a host convention, not new persisted state. No active-team field is required in `ActiveSession`; adding one would create a new workflow without improving the assembly mechanic. The existing scoreboard, standings, score undo, timer, and reveal controls remain authoritative.

## 14. Individual Play

Individual Play remains shared-screen and host-driven. The host announces the active player for the round; that player assembles the verse with the host’s device or the host enters the player’s verbal answer. A correct result may receive +1 for that roster member.

The active player is not stored as a second player-state system in v1. The existing Phase 1 roster and score-event architecture tracks players and standings; turn rotation remains a host practice. This avoids inventing participant-device assumptions or a new persisted turn schema.

## 15. Fellowship Mode

Fellowship Mode is collaborative, untimed only when the host chooses No Time Limit, and has no competitive score. The group and host assemble the verse together, may retry unlimited incorrect submissions, and use Reveal Answer as a teaching transition.

The same round engine and result flow are used. Only platform mode behavior changes: score controls are absent and completion is about shared learning rather than ranking.

## 16. Study Mode

Study Mode is applicable without a separate game implementation:

- Session Studio’s existing mode behavior sets No Time Limit.
- Incorrect submissions remain retryable.
- Correct and revealed results show the complete verse.
- The existing Bible Reference Display setting is respected exactly; Study Mode must not override a deliberate Hidden selection.
- No competitive points are added by Verse Builder.

Optional context or discussion metadata may be displayed later, but it is not required for Verse Builder v1. The learning value comes from the exact verse, stable reference handling, and retry/reveal flow.

## 17. Quick Play

Quick Play should follow the current Quiz and Four Pics standalone shape: setup, optional Mix Verses preparation, play, and completion, without hosted standings or session restoration.

Recommended setup:

- Round count options: 5, 10, 15, or 20, plus Custom up to the available reviewed content count.
- Difficulty: All, Introductory, Intermediate, or Advanced.
- Time options: 20, 30, 45, or 60 seconds; default 45 seconds.
- Reference: After Answer Reveal by default, matching the current standalone game behavior. If the existing user preference is exposed in the standalone wrapper, it may be honored without creating a new contract.
- Hints: none.
- Order: Mix Verses prepares once; changing setup values invalidates the prepared set.

Rounds use the same assembly engine as Hosted Session. Quick Play has no platform score events, no roster, and no persisted ActiveSession. Completion reports rounds completed and a compact correct/revealed summary, then offers the existing return/replay actions.

## 18. Hosted Session

Session Studio adds Verse Builder as another playlist item using the existing fields: content pack, round count, source/random order, time limit, expiry behavior, difficulty filter, and presentation settings. The registry supplies the Library title, description, content count, lazy preload, and game renderer.

At session creation, preparation selects content and stores each round’s segment shuffle. The platform owns `roundIndex`, `roundStates`, `timer`, `NEXT`, `PREVIOUS`, `REVEAL`, reset, persistence, roster, score events, standings, fullscreen, sound, and motion preferences. Verse Builder contributes only assembly state and evaluation.

The shared hosted renderer uses the existing GameTopBar and HostControlDock. Reveal, Next, Previous, Reset Round, timer, scoring overlays, and final results remain platform controls rather than game-specific replacements.

## 19. Sequence/Assembly Engine Contract

The minimum reusable engine is content-agnostic and ID-based. It should support only these concepts:

| Concept | Contract |
| --- | --- |
| Canonical items | Ordered items with stable IDs and display text. The engine does not know they are Bible segments. |
| Prepared order | A seeded shuffled list of the same IDs, guaranteed not to equal canonical order when at least two items exist. |
| Assembly state | Ordered selected IDs; unselected IDs are derived from the prepared item set. |
| Add | Append one unselected ID. Reject unknown or duplicate IDs. |
| Remove | Remove one selected ID and return it to Available. |
| Move | Move a selected ID one position earlier or later; no wraparound. |
| Reset | Empty the arrangement while retaining the prepared shuffle. |
| Submit | Report incomplete, correct, or incorrect; increment attempt count only for a complete incorrect submission. |
| Reveal | Return canonical IDs as the stable displayed arrangement. |
| Derived results | `isComplete`, `isCorrect`, available IDs, and a compact result description. No timer, score, roster, reference, or UI state. |

The engine should be pure and deterministic. Verse Builder’s adapter supplies content records and maps platform actions to engine operations. Future users can provide events, timeline entries, or memory-verse chunks without adding Bible-specific branches to the engine.

## 20. State Ownership

### Platform-owned

- Session lifecycle, mode, playlist, round progression, and `canAdvance`.
- Roster, competitor identity, manual score events, standings, and final results.
- Timer, expiry behavior, sound, motion, fullscreen, reference-display preference, and Presentation Settings.
- Active-session persistence, restoration, storage errors, schema migration, and content-version checks.
- Host controls and future audience-snapshot versioning.

### Sequence/Assembly-owned

- Canonical item IDs supplied by the content adapter.
- Prepared shuffled item IDs supplied by the round adapter.
- Current assembled item IDs, movement, removal, reset, and attempt count.
- Pure completeness and correctness evaluation.
- Canonical arrangement returned by reveal.

The generic platform `RoundResult` remains the lifecycle source of truth. The engine must not store a second independent `correct` or `revealed` flag; the reducer maps engine outcomes to `unchecked`, `incorrect`, `correct`, `revealed`, or `expired`.

## 21. Persistence

The existing `ActiveSession` snapshot must preserve enough state to restore the exact round:

- prepared `shuffledSegmentIds`;
- current `arrangedSegmentIds`;
- attempt count;
- platform `result`;
- current timer state and expiry behavior through the existing fields.

On restoration, transient `incorrect` or `checking` states become `unchecked` while the current arrangement and attempt count remain intact. Correct, revealed, and expired states remain resolved. The prepared shuffle must never be regenerated from the content ID during reload.

A session schema bump to **v3** is recommended because the prepared-round and persisted-round unions gain a new discriminant. The v2-to-v3 migration should preserve existing Quiz and Four Pics snapshots losslessly; no v2 snapshot contains Verse Builder state. The content registry may also need a content-version increment when the new records ship, but that change must not strand existing sessions whose old content IDs still resolve. The compatibility/migration path should upgrade such snapshots rather than relying only on an exact old-version rejection.

No second local-storage key or game-specific persistence layer is justified.

## 22. Accessibility

- Use native buttons and ordered lists; do not require HTML drag events or `aria-grabbed` semantics.
- Available controls are labelled “Add segment N of M: [text].” Answer controls identify the segment position, text, and available actions.
- Move Earlier, Move Later, Remove, Reset, and Submit Answer have visible text or accessible labels and retain the existing 44x44 minimum target.
- After adding or moving a segment, focus stays on the affected answer item. After removal, focus moves predictably to the nearest answer item or the returned Available button.
- A polite live region announces changes such as “Segment added. 4 of 8 placed.” It does not repeat the entire verse on every action.
- After submit, focus moves to the result message or round heading. After Next, the existing heading-focus behavior is retained.
- Enter and Space activate controls; Tab provides the complete path. The existing R reveal, Enter/ArrowRight advance, and ArrowLeft previous-round shortcuts remain host shortcuts, with focusable controls always available.
- Color is never the only correctness signal. Correct, incorrect, revealed, and expired states use text and status semantics.
- Reduced Motion uses stable immediate updates. Full Motion may add a short nonessential transition, but the answer must remain understandable with animation disabled.
- High-contrast themes must preserve text contrast for chunks, boundaries, focus rings, status, and disabled controls.

## 23. Responsive / Projector UX

### Mobile

- Portrait layout is one column: Available Segments above Your Verse, followed by full-width actions.
- The answer is a vertical wrapping list, never a fixed-width horizontal row.
- Segment text may wrap; the UI must not shrink text to keep a single line.
- Keep one principal page scroll. Avoid nested scroll areas inside the two regions.
- Use 44x44 or larger touch targets, comfortable gaps, and a visible Submit Answer button.
- Long verses are limited by the 12-segment validation ceiling and should remain usable at approximately 390x844.

### Short landscape and desktop

Use the existing session grid and host-control conventions. Where width permits, Available and Your Verse may sit side by side; at short heights they must remain vertically compact without hiding the answer or controls. The host dock may continue to wrap or become static under the existing mobile breakpoints.

### TV and projector

The future audience projection should use large wrapped segment chips, a clear answer-order hierarchy, and no dense single-line token strip. Target 4-8 chunks per line and no more than three lines before the layout yields to a readable scroll or alternate arrangement. The complete verse and reference should use a larger text hierarchy than status or controls. Do not solve presenter mode here; only ensure the game state can be projected cleanly later.

## 24. Future Audience Projection

The future read-only projection should derive from a versioned snapshot of the host-owned `ActiveSession`. The minimum Verse Builder projection contains:

- projection schema version, session ID, round ID, game ID, and progress;
- reference only when allowed by `referenceDisplay` or after resolution;
- available segment text and current assembled segment text, with stable IDs/order;
- result phase and concise status;
- canonical full verse only after correct, reveal, auto-reveal, or another platform-authorized resolution;
- timer projection from the platform timer;
- score/standings projection only when the existing audience-score setting permits it.

The audience projection has no mutation callbacks, no engine dispatch, and no ability to alter the arrangement or session. A later BroadcastChannel can transport the snapshot without changing this contract.

## 25. Content Validation

Future deterministic validation must cover:

- stable unique record IDs and segment IDs;
- supported content and schema versions;
- non-empty matching reference fields and valid canonical KJV citation;
- exact non-empty canonical text;
- 3-12 ordered segments, each trimmed and non-empty;
- no leading/trailing whitespace or malformed Unicode;
- normalized segment join exactly reproduces normalized canonical text;
- all segment IDs are unique even when display text repeats;
- difficulty label matches the word/segment/repetition formula;
- approved content-pack membership and review/source metadata;
- no duplicate normalized canonical verse within the Verse Builder pack;
- prepared shuffles contain every canonical ID once and are not accidentally solved when at least two IDs exist.

Malformed punctuation must fail validation rather than being silently repaired. The content review process, not the runtime engine, decides whether a phrase boundary is pedagogically good.

## 26. Testing Strategy

### Unit

- deterministic seeded shuffle and solved-order prevention;
- duplicate display text with distinct IDs;
- add, remove, move, bounds, reset, incomplete submit, correct submit, incorrect submit, attempt count, and reveal;
- canonical reconstruction and content validation;
- expiry mapping and persisted state shape;
- session v2-to-v3 migration and restoration of prepared order.

### Component

- mouse/touch-equivalent button flow;
- keyboard add, move, remove, reset, submit, and focus retention;
- screen-reader labels, live announcements, result status, and disabled states;
- reduced-motion class/behavior and readable wrapped chunks.

### Hosted

- timer starts, pauses, expires, restores paused, and follows all three expiry behaviors;
- correct and revealed rounds advance; unresolved rounds do not;
- Team, Individual, Fellowship, and Study behavior;
- manual score +1/-1, undo, standings, final results, and no duplicate game score store;
- reset retains the prepared shuffle.

### Quick Play

- setup counts, custom validation, difficulty filtering, mixed preparation, round progression, retries, reveal, timer expiry, and completion.

### Responsive

Exercise mobile portrait near 390x844, short landscape, desktop, and fullscreen/projector-relevant widths. Test long valid verses, the maximum segment count, repeated chunks, long feedback, and reference visibility.

### Future audience

Unit-test the read-only snapshot shape and answer-redaction rules without implementing an audience window or BroadcastChannel.

## 27. Verse Builder v1 Scope

### Required

- Official Verse Builder identity and Library registration.
- Twenty independently reviewed KJV verse records.
- Curated phrase chunks with stable IDs and deterministic difficulty.
- Minimal pure Sequence/Assembly engine.
- Seeded, restoration-safe shuffle.
- Explicit Submit Answer, retry, reset, reveal, and platform expiry behavior.
- Quick Play and Hosted Session integration.
- Existing Fellowship, Team, Individual, and Study mode boundaries.
- Existing timer, reference display, score events, standings, and final-results systems.
- Session schema migration and persistence of prepared/current assembly state.
- Keyboard, mouse, touch, screen-reader, reduced-motion, mobile, and projector-safe layout behavior.
- Focused unit, component, hosted, Quick Play, and responsive tests.

### Defer

- Hints and hint scoring.
- Optional drag-and-drop convenience interaction.
- Multiple hand-authored segmentation tiers per verse.
- Content Studio or user-authored verse packs.
- Passage/range assembly, cross-verse rounds, explanations, and discussion prompts.
- Audience Screen, dual-window presentation, BroadcastChannel, and connected participation.

### Do not include

- Word-by-word token clouds as the default mechanic.
- Automatic segmentation as runtime authority.
- Time-based or attempt-multiplier scoring.
- Participant phones, backend rooms, authentication, or cloud sync.
- A universal game engine or a second timer/score/persistence system.
- Music, audio, lyric, licensing, or Worship & Music work.

## 28. Future Sequence-Engine Reuse

The engine’s stable-ID item model and operations are broad enough for Memory Verse Challenge, Bible Timeline, Arrange Events, and Scripture Sequence. Those games can supply different ordered records and presentation text while reusing preparation, add/remove/move/reset/submit/reveal, duplicate-identity handling, and deterministic tests. Verse Builder should not add future-game-specific rules now.

## 29. Main Risks

| Risk | Mitigation |
| --- | --- |
| Long verses become unreadable | Limit v1 to 6-36 words and 3-12 curated chunks; use vertical wrapping and readable projector density. |
| Repeated words or phrases are ambiguous | Give every segment a unique ID and validate by ID, not display text. |
| Punctuation is lost or malformed | Preserve punctuation in curated segment text and require normalized reconstruction equality. |
| Mobile token density is poor | Use phrase chunks, one-column wrapping, large buttons, and no drag-only interaction. |
| Keyboard interaction becomes control-heavy | Use a small fixed action set, predictable focus, and native buttons; defer advanced keyboard drag semantics. |
| KJV content is inaccurate | Require approved-source provenance, independent review, hash/version notes, and deterministic validators. |
| Persistence re-randomizes a round | Store prepared shuffle and current arrangement; restore from IDs, not fresh random calls. |
| Schema/content changes strand sessions | Add explicit v2-to-v3 migration and compatible content-version handling. |
| Scoring is unfair across modes | Use fixed +1 host-awarded scoring, no speed bonus, no retry penalty, and no points in noncompetitive modes. |
| Team/Individual workflows assume participant devices | Keep one shared host interaction surface; make turns and active competitors host conventions. |
| Future audience projection leaks answers or mutates state | Use redacted, versioned, read-only snapshots derived from ActiveSession. |

## 30. Recommended Implementation Sequence

1. **Types and content contract:** Add the Verse Builder discriminants and validation design, then admit only the approved 20-record content set after source review.
2. **Pure engine:** Implement preparation, identity-safe seeded shuffle, assembly operations, submission, reset, reveal, and engine unit tests.
3. **Session adapter/state:** Add prepared-round and round-state variants, reducer actions, `canAdvance` mapping, timer expiry mapping, and v2-to-v3 migration tests.
4. **One basic renderer:** Build the shared assembly UI against a small validated fixture, including button interaction, explicit submit, retry, reveal, and focus behavior.
5. **Quick Play:** Add the standalone setup/play/complete wrapper using the existing Quick Play shape and countdown conventions.
6. **Hosted Session:** Add registry/preparation/playlist integration and reuse the existing GameTopBar, HostControlDock, Session Studio, and session reducer boundaries.
7. **Scoring and modes:** Verify manual Team and Individual +1 scoring, Fellowship behavior, Study defaults, reference display, expiry, standings, and final results.
8. **Persistence and restoration:** Persist prepared/current assembly state, migrate snapshots, and verify paused restoration and exact reset behavior.
9. **Responsive and accessibility hardening:** Exercise keyboard, screen reader semantics, reduced motion, mobile portrait, short landscape, desktop, and projector-safe wrapping.
10. **Focused browser verification:** Run targeted Verse Builder unit/component/hosted/Quick Play and responsive tests, then run the existing milestone regression once. Avoid repeatedly running the full browser matrix during intermediate edits.

**Recommended next implementation: Verse Builder v1**

**Recommended engine: minimal reusable Sequence/Assembly engine**
