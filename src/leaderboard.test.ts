import { describe, expect, it } from "vitest";
import {
  addLeaderboardEntry,
  clearStoredUserData,
  createEmptyLeaderboards,
  isNicknameTaken,
  loadLeaderboards,
  loadPlayerNickname,
  validateNickname,
} from "./leaderboard";

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

  it("rejects Chinese nicknames and blocked pinyin fragments", () => {
    expect(validateNickname("阿晴")).toEqual({ ok: false, message: "昵称不能包含中文" });
    expect(validateNickname("xijinping2026")).toEqual({ ok: false, message: "昵称包含不允许的拼音，请修改" });
    expect(validateNickname("Player88")).toEqual({ ok: true });
    expect(validateNickname("玩家88")).toEqual({ ok: false, message: "昵称不能包含中文" });
  });

  it("clears stored user data before loading cached nickname and rankings", () => {
    const storage = {
      data: new Map<string, string>([
        ["lianliankan-leaderboards-v1", JSON.stringify({ easy: [{ nickname: "Old", seconds: 10, moves: 5, completedAt: "2026-07-10T00:00:00.000Z" }], normal: [], hard: [] })],
        ["guoquduiduixiao-player-nickname-v1", "Old"],
        ["guoquduiduixiao-user-data-reset-v1", "false"],
      ]),
      get length() {
        return this.data.size;
      },
      getItem(key: string) {
        return this.data.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.data.set(key, value);
      },
      removeItem(key: string) {
        this.data.delete(key);
      },
      clear() {
        this.data.clear();
      },
      key(index: number) {
        return Array.from(this.data.keys())[index] ?? null;
      },
    } as Storage;

    clearStoredUserData(storage);

    expect(loadLeaderboards(storage)).toEqual(createEmptyLeaderboards());
    expect(loadPlayerNickname(storage)).toBe("");
    expect(storage.getItem("guoquduiduixiao-user-data-reset-v1")).toBe("true");
  });

  it("marks storage as migrated after clearing legacy data", () => {
    const storage = {
      data: new Map<string, string>([
        ["lianliankan-leaderboards-v1", JSON.stringify({ easy: [], normal: [], hard: [] })],
        ["guoquduiduixiao-player-nickname-v1", "Old"],
      ]),
      get length() {
        return this.data.size;
      },
      getItem(key: string) {
        return this.data.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.data.set(key, value);
      },
      removeItem(key: string) {
        this.data.delete(key);
      },
      clear() {
        this.data.clear();
      },
      key(index: number) {
        return Array.from(this.data.keys())[index] ?? null;
      },
    } as Storage;

    clearStoredUserData(storage);

    expect(storage.getItem("guoquduiduixiao-user-data-reset-v1")).toBe("true");
  });
});
