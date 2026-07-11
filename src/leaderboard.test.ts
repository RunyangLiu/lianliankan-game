import { describe, expect, it } from "vitest";
import { addLeaderboardEntry, createEmptyLeaderboards, isNicknameTaken } from "./leaderboard";

describe("leaderboard", () => {
  it("keeps separate rankings for each difficulty", () => {
    const leaderboards = createEmptyLeaderboards();
    const updated = addLeaderboardEntry(leaderboards, "easy", {
      nickname: "小明",
      seconds: 42,
      moves: 12,
      completedAt: "2026-07-10T00:00:00.000Z",
    });

    expect(updated.easy).toHaveLength(1);
    expect(updated.normal).toHaveLength(0);
    expect(updated.hard).toHaveLength(0);
  });

  it("sorts by shorter time first and fewer moves second", () => {
    const leaderboards = createEmptyLeaderboards();
    const updated = [
      { nickname: "慢", seconds: 80, moves: 8, completedAt: "2026-07-10T00:00:00.000Z" },
      { nickname: "快", seconds: 40, moves: 20, completedAt: "2026-07-10T00:00:00.000Z" },
      { nickname: "稳", seconds: 40, moves: 12, completedAt: "2026-07-10T00:00:00.000Z" },
    ].reduce((current, entry) => addLeaderboardEntry(current, "normal", entry), leaderboards);

    expect(updated.normal.map((entry) => entry.nickname)).toEqual(["稳", "快", "慢"]);
  });

  it("detects duplicate nicknames within the selected difficulty", () => {
    const leaderboards = addLeaderboardEntry(createEmptyLeaderboards(), "hard", {
      nickname: "PlayerOne",
      seconds: 60,
      moves: 18,
      completedAt: "2026-07-10T00:00:00.000Z",
    });

    expect(isNicknameTaken(leaderboards, "hard", " playerone ")).toBe(true);
    expect(isNicknameTaken(leaderboards, "easy", "PlayerOne")).toBe(false);
  });

  it("keeps only the best score for the same nickname in one difficulty", () => {
    const leaderboards = [
      { nickname: "小云", seconds: 90, moves: 20, completedAt: "2026-07-10T00:00:00.000Z" },
      { nickname: "小云", seconds: 60, moves: 24, completedAt: "2026-07-10T00:01:00.000Z" },
    ].reduce((current, entry) => addLeaderboardEntry(current, "easy", entry), createEmptyLeaderboards());

    expect(leaderboards.easy).toHaveLength(1);
    expect(leaderboards.easy[0]).toMatchObject({ nickname: "小云", seconds: 60 });
  });
});
