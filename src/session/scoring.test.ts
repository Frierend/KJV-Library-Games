import { describe, expect, it } from "vitest";
import { normalizePlayers, validatePlayers } from "./scoring";

describe("individual roster validation", () => {
  it("trims names while retaining stable player IDs", () => {
    expect(normalizePlayers([{ id: "stable-id", name: "  Mary  " }])).toEqual([
      { id: "stable-id", name: "Mary" },
    ]);
  });

  it("rejects blank and case-insensitive duplicate names", () => {
    const validation = validatePlayers([
      { id: "blank", name: "   " },
      { id: "first", name: "Grace" },
      { id: "second", name: " grace " },
    ]);
    expect(validation.nameErrors.blank).toBe("Enter a player name.");
    expect(validation.nameErrors.first).toBe("This player name is already in use. Enter a different name.");
    expect(validation.nameErrors.second).toBe("This player name is already in use. Enter a different name.");
  });

  it("accepts one player and a roster of fifty", () => {
    expect(validatePlayers([{ id: "only", name: "Only" }]).firstError).toBe("");
    const players = Array.from({ length: 50 }, (_, index) => ({
      id: `player-${index}`,
      name: `Player ${index + 1}`,
    }));
    expect(validatePlayers(players).firstError).toBe("");
  });
});
