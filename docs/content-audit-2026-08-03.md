# KJVenture content audit — 2026-08-03

## Scope and inventory

This audit covered every user-visible content record in both playable modes and the derived content registry/pack:

| Mode | Source | Derived registry | Records | Unchanged | Corrected |
| --- | --- | --- | ---: | ---: | ---: |
| Bible Quiz | `src/data/quizQuestions.ts` | `quizContentRecords` | 100 | 93 | 7 |
| Four Pics Bible Word | `src/data/fourPicsPuzzles.ts` | `fourPicsContentRecords` | 30 | 28 | 2 |
| **Total** |  | `allContentRecords` / `kjventure-core` | **130** | **121** | **9** |

No additional playable modes, hidden question banks, duplicate records, contradictory duplicate prompts, or orphaned pack entries were found. No record was removed, no correct answer changed, and no issue remains unresolved.

## KJV authority and method

Every prompt, answer, option, citation, explanation, clue label, and accepted answer was reviewed individually against the standardized 1769 King James (Authorized) Version distributed by eBible.org/CrossWire: <https://ebible.org/eng-kjv/indexbar.htm>. The downloaded `kjvtxt.zip` used for the audit had SHA-256 `1FBE9C708D508EFFD13CF2C1238D38B7E13476734876F0580D8DC61941916F7C`. The reference corpus remained outside the repository, and only the canonical 66 books were treated as valid content authority.

The review checked factual accuracy, exact answer keys, distractor uniqueness, citation relevance, KJV-compatible wording, misleading ambiguity, duplicate/contradictory prompts, Unicode integrity, clue accuracy, letter-bank solvability for every possible generated hint position, stable IDs, pack membership, and derived-registry coverage.

## Historical source status

The historical audit source remains recorded for provenance:

- Artifact: `kjvtxt.zip`
- Recorded SHA-256: `1FBE9C708D508EFFD13CF2C1238D38B7E13476734876F0580D8DC61941916F7C`
- Status as of 2026-08-13: unavailable locally

The historical artifact is not being treated as though it is still available, and its hash is not being reused for the current Verse Builder source.

## Current approved Verse Builder source

Verse Builder starter content is re-baselined to a currently obtainable official eBible distribution:

- Translation: King James / Authorized Version, standardized 1769 text
- Provider: eBible.org / CrossWire Bible Society
- Artifact: `eng-kjv_vpl.zip`
- Acquisition: official eBible.org Scriptures distribution
- Acquisition date: 2026-08-13
- Locally verified SHA-256: `0E2C5C10C808BAFB2A9F55B95A1A0908FB28E71DD67661B367D0F26B7551C39A`
- Scope: standard 66-book Protestant canon only for KJVenture content
- Raw artifact location: external to the Git repository
- Reason for re-baseline: the historical audited archive was unavailable; the project adopted a currently obtainable official provider artifact to make Scripture-content provenance reproducible.

The archive contains `eng-kjv_vpl.txt`, `eng-kjv_vpl.xml`, and `eng-kjv_vpl.sql` representations, plus descriptive metadata. The Verse Builder pack uses `eng-kjv_vpl.xml`, whose UTF-8 `<v b="..." c="..." v="...">...</v>` records provide deterministic book/chapter/verse locators and exact verse text. The provider metadata identifies this distribution as including Apocrypha/Deuterocanon; KJVenture selection explicitly excludes those books and uses only the standard 66-book Protestant canon. The XML records may contain a leading paragraph marker (`¶`), which is removed only as deterministic source-format markup before trimming; no Scripture wording is otherwise changed.

The new archive is not claimed to be byte-identical to the historical archive.

## Corrections

| ID | Original wording / answer / citation | Corrected wording / answer / citation | Reason |
| --- | --- | --- | --- |
| `quiz-048` | “Which king wrote many of the Psalms?” / David / “Psalm titles” | Same prompt and answer / `Psalm 3:1; 4:1; 5:1` | Replaced a non-citation label with canonical supporting references. |
| `quiz-052` | “Which prophet was known as the weeping prophet?” / Jeremiah / `Jeremiah 9:1` | “Which prophet wished that his eyes were a fountain of tears?” / Jeremiah / same citation | Removed an extrabiblical nickname and tied the prompt directly to the KJV text. |
| `quiz-063` | “How many people were fed with five loaves and two fishes?” / About 5,000 men / `Matthew 14:17–21` | “About how many men were fed with five loaves and two fishes?” / same answer and citation | The verse counts about five thousand men, besides women and children. |
| `quiz-069` | “For how many pieces of silver was Jesus betrayed?” / 30 / `Matthew 26:15` | “For how many pieces of silver did Judas agree to deliver Jesus?” / 30 / `Matthew 26:14–15` | Makes the actor and transaction explicit and supplies the complete immediate context. |
| `quiz-076` | “What did the angels announce to the shepherds?” / A Saviour is born / `Luke 2:10–11` | “What did the angel announce to the shepherds?” / same answer and citation | The quoted announcement is made by one angel; the multitude appears afterward. |
| `quiz-080` | “What did the father give the returning prodigal son?” / The best robe / `Luke 15:22` | “Which of these did the father give the returning prodigal son?” / same answer and citation | The verse also names a ring and shoes, so the original singular wording was ambiguous. |
| `quiz-090` | “On what road did Saul encounter Jesus?” / Damascus / `Acts 9:3–6` | “Near which city did Saul encounter Jesus?” / Damascus / same citation | The passage says Saul came near Damascus; it does not name a “Damascus road.” |
| `four-pics-loaves` | Clue: “Five barley breads” / LOAVES / `John 6:9–13` | Clue: “Five barley loaves” / same answer and citation | Uses the KJV noun and avoids an imprecise clue. |
| `four-pics-dove` | Clue: “A white bird descending” / DOVE / `Matthew 3:16` | Clue: “A dove descending” / same answer and citation | Scripture identifies a dove but does not specify that it was white. |

## Silver investigation

The reported “silver” defect maps to `quiz-069`, whose intended subject is Judas agreeing to deliver Jesus for thirty pieces of silver in Matthew 26:14–15. It is not the Joseph sale in Genesis 37:28, which says twenty pieces of silver. The prompt and citation were tightened as shown above; the answer `30` was already correct.

## Permanent safeguards

- Canonical 66-book citation parsing now rejects unknown books, impossible chapter numbers, zero/reversed ranges, and descriptive labels masquerading as citations.
- Registry validation now covers normalized duplicate/contradictory prompts, exact answer occurrence and indexing, unique/nonempty choices and clues, stable Four Pics IDs, one visual per clue, valid letter inputs/alternatives, KJV-only translation labels, malformed/invisible Unicode, citation metadata agreement, schema version, IDs, and pack membership.
- A semantic fingerprint locks all 130 reviewed records—including explanations and clues—to their stable IDs, so later content edits require deliberate review.
- Four Pics tests exhaust every possible generated hint-position combination and prove each remaining letter bank can still form the answer.
- Responsive E2E coverage exercises both modes, the longest real prompt/explanation, the four reported reference examples, and artificially lengthened feedback at every required viewport.
