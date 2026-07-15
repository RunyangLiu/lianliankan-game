import { describe, expect, it } from "vitest";
import { calculateCompletionRating, getChallengeLevel, getCompletionTitle, nextComboAfterMatch } from "./progression";
import { levelList } from "./game";

describe("progression rules", () => {
  it("awards three stars for a quick clean round with a combo", () => {
    expect(
      calculateCompletionRating({
        level: 3,
        seconds: 70,
        moves: 28,
        hintsUsed: 0,
        maxCombo: 4,
        challenge: false,
      }),
    ).toEqual({ stars: 3, targetSeconds: 135, targetMoves: 52 });
  });

  it("keeps at least one star when the player finishes slowly", () => {
    expect(
      calculateCompletionRating({
        level: 6,
        seconds: 400,
        moves: 160,
        hintsUsed: 3,
        maxCombo: 1,
        challenge: false,
      }).stars,
    ).toBe(1);
  });

  it("uses stricter targets in challenge mode", () => {
    const normal = calculateCompletionRating({
      level: 5,
      seconds: 150,
      moves: 80,
      hintsUsed: 1,
      maxCombo: 3,
      challenge: false,
    });
    const challenge = calculateCompletionRating({
      level: 5,
      seconds: 150,
      moves: 80,
      hintsUsed: 1,
      maxCombo: 3,
      challenge: true,
    });

    expect(challenge.targetSeconds).toBeLessThan(normal.targetSeconds);
    expect(challenge.targetMoves).toBeLessThan(normal.targetMoves);
  });

  it("increments combo after each successful match", () => {
    expect(nextComboAfterMatch(0)).toBe(1);
    expect(nextComboAfterMatch(2)).toBe(3);
  });

  it("selects a later shifting level for challenge mode", () => {
    expect(getChallengeLevel(levelList).level).toBeGreaterThanOrEqual(5);
  });

  it("labels completion results by star count", () => {
    expect(getCompletionTitle(3)).toBe("三星通关");
    expect(getCompletionTitle(1)).toBe("继续加油");
  });
});
