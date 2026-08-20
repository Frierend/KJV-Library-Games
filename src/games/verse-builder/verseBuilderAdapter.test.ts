import { describe, expect, it } from "vitest";
import { verseBuilderContentRecords } from "../../content/registry";
import { createSeededRandom } from "../../session/createSession";
import { createPlaylistItem } from "../../session/presets";
import { isSessionConfig } from "../../session/storage";
import { defaultSessionConfig } from "../../session/presets";
import { prepareVerseBuilderRounds } from "./verseBuilderAdapter";
import { DEFAULT_VERSE_BUILDER_SETTINGS, LEGACY_VERSE_BUILDER_SETTINGS } from "./verseBuilderTypes";

describe("Verse Builder hosted adapter", () => {
  it("prepares source-order rounds with persisted canonical and shuffled IDs", () => {
    const rounds = prepareVerseBuilderRounds(2, "source", createSeededRandom("source"));
    const record = verseBuilderContentRecords[0];

    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toMatchObject({
      gameId: "verse-builder",
      contentId: record.id,
      canonicalSegmentIds: record.segments.map((segment) => segment.id),
      shuffledSegmentIds: expect.arrayContaining(record.segments.map((segment) => segment.id)),
    });
    if (rounds[0]?.playStyle === "missing-words") throw new Error("Verse Order preparation fixture is missing");
    expect(rounds[0].shuffledSegmentIds).toHaveLength(record.segments.length);
  });

  it("uses a deterministic shuffled selection for random-order rounds", () => {
    const first = prepareVerseBuilderRounds(5, "random", createSeededRandom("same"));
    const second = prepareVerseBuilderRounds(5, "random", createSeededRandom("same"));

    expect(second).toEqual(first);
    expect(first.map((round) => round.contentId)).not.toEqual(
      verseBuilderContentRecords.slice(0, 5).map((record) => record.id),
    );
  });

  it("caps requested rounds at the frozen 20-record pack", () => {
    expect(prepareVerseBuilderRounds(99, "source", Math.random)).toHaveLength(20);
  });

  it("defaults Verse Builder playlist items to five rounds and sixty seconds", () => {
    const item = createPlaylistItem("verse-builder", 0);

    expect(item).toMatchObject({
      gameId: "verse-builder",
      roundCount: 5,
      timerSeconds: 60,
      verseBuilder: DEFAULT_VERSE_BUILDER_SETTINGS,
    });
    expect(isSessionConfig({ ...defaultSessionConfig, playlist: [item] })).toBe(true);
  });

  it("prepares persisted blanks or the existing Sequence fields by style", () => {
    const missing = prepareVerseBuilderRounds(1, "source", DEFAULT_VERSE_BUILDER_SETTINGS, createSeededRandom("missing"));
    expect(missing[0]).toMatchObject({ gameId: "verse-builder", playStyle: "missing-words", difficulty: "introductory" });
    if (missing[0]?.playStyle !== "missing-words") throw new Error("Missing Words preparation fixture is missing");
    expect(missing[0]).toHaveProperty("blankTokenIndices");
    expect(missing[0].blankTokenIndices).toHaveLength(1);

    const order = prepareVerseBuilderRounds(1, "source", LEGACY_VERSE_BUILDER_SETTINGS, createSeededRandom("order"));
    expect(order[0]).toMatchObject({ gameId: "verse-builder", canonicalSegmentIds: expect.any(Array), shuffledSegmentIds: expect.any(Array) });
    if (order[0]?.playStyle === "missing-words") throw new Error("Verse Order preparation fixture is missing");
    expect("blankTokenIndices" in order[0]).toBe(false);
  });
});
