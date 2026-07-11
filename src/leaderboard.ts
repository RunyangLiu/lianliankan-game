import { type DifficultyId } from "./game";

export type LeaderboardEntry = {
  nickname: string;
  seconds: number;
  moves: number;
  completedAt: string;
};

export type Leaderboards = Record<DifficultyId, LeaderboardEntry[]>;

export const leaderboardStorageKey = "lianliankan-leaderboards-v1";
export const playerNicknameStorageKey = "guoquduiduixiao-player-nickname-v1";

export function createEmptyLeaderboards(): Leaderboards {
  return {
    easy: [],
    normal: [],
    hard: [],
  };
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLocaleLowerCase();
}

export function isNicknameTaken(leaderboards: Leaderboards, difficultyId: DifficultyId, nickname: string): boolean {
  const normalized = normalizeNickname(nickname);
  return leaderboards[difficultyId].some((entry) => normalizeNickname(entry.nickname) === normalized);
}

export function addLeaderboardEntry(
  leaderboards: Leaderboards,
  difficultyId: DifficultyId,
  entry: LeaderboardEntry,
): Leaderboards {
  const seenNames = new Set<string>();
  const nextEntries = [...leaderboards[difficultyId], entry]
    .sort((a, b) => a.seconds - b.seconds || a.moves - b.moves)
    .filter((item) => {
      const normalized = normalizeNickname(item.nickname);

      if (seenNames.has(normalized)) {
        return false;
      }

      seenNames.add(normalized);
      return true;
    })
    .slice(0, 10);

  return {
    ...leaderboards,
    [difficultyId]: nextEntries,
  };
}

export function loadLeaderboards(storage = window.localStorage): Leaderboards {
  try {
    const raw = storage.getItem(leaderboardStorageKey);

    if (!raw) {
      return createEmptyLeaderboards();
    }

    return {
      ...createEmptyLeaderboards(),
      ...JSON.parse(raw),
    };
  } catch {
    return createEmptyLeaderboards();
  }
}

export function saveLeaderboards(leaderboards: Leaderboards, storage = window.localStorage): void {
  storage.setItem(leaderboardStorageKey, JSON.stringify(leaderboards));
}

export function loadPlayerNickname(storage = window.localStorage): string {
  try {
    return (storage.getItem(playerNicknameStorageKey) || "").trim();
  } catch {
    return "";
  }
}

export function savePlayerNickname(nickname: string, storage = window.localStorage): void {
  storage.setItem(playerNicknameStorageKey, nickname.trim());
}
