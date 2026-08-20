import { describe, expect, it } from "vitest";
import {
  DEFAULT_VERSE_BUILDER_SETTINGS,
  LEGACY_VERSE_BUILDER_SETTINGS,
  blankCountForDifficulty,
  resolveVerseBuilderSettings,
} from "./verseBuilderTypes";

describe("Verse Builder settings", () => {
  it("defaults new settings to Missing Words and absent settings to legacy Verse Order", () => {
    expect(DEFAULT_VERSE_BUILDER_SETTINGS).toEqual({
      playStyle: "missing-words",
      missingWordsDifficulty: "introductory",
      verseOrderDifficulty: "all",
    });
    expect(resolveVerseBuilderSettings(undefined)).toEqual(LEGACY_VERSE_BUILDER_SETTINGS);
    expect(() => resolveVerseBuilderSettings({ playStyle: "unknown" })).toThrow(/play style/i);
  });

  it.each([
    ["introductory", 1],
    ["intermediate", 2],
    ["advanced", 3],
  ] as const)("maps %s to %s blank(s)", (difficulty, count) => {
    expect(blankCountForDifficulty(difficulty)).toBe(count);
  });
});
