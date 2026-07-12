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
export const storedUserDataResetKey = "guoquduiduixiao-user-data-reset-v1";

const blockedNicknameFragments = ["xijinping", "jinping", "xjp"];

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

export function validateNickname(
  nickname: string,
): { ok: true } | { ok: false; message: string } {
  const trimmed = nickname.trim();

  if (!trimmed) {
    return { ok: false, message: "请输入昵称" };
  }

  if (/[\p{Script=Han}]/u.test(trimmed)) {
    return { ok: false, message: "昵称不能包含中文" };
  }

  if (!/^[A-Za-z0-9\p{Extended_Pictographic}\u200d\ufe0f]+$/u.test(trimmed)) {
    return { ok: false, message: "昵称只能使用英文字母、数字和表情" };
  }

  const normalized = normalizeNickname(trimmed);

  if (blockedNicknameFragments.some((fragment) => normalized.includes(fragment))) {
    return { ok: false, message: "昵称包含不允许的拼音，请修改" };
  }

  return { ok: true };
}

export function clearStoredUserData(storage = window.localStorage): void {
  storage.removeItem(leaderboardStorageKey);
  storage.removeItem(playerNicknameStorageKey);
  storage.setItem(storedUserDataResetKey, "true");
}

export function ensureStoredUserDataReset(storage = window.localStorage): void {
  try {
    const rawResetFlag = storage.getItem(storedUserDataResetKey);

    if (rawResetFlag === "true") {
      return;
    }

    const hasLegacyData = storage.getItem(leaderboardStorageKey) !== null || storage.getItem(playerNicknameStorageKey) !== null;

    if (hasLegacyData || rawResetFlag === null) {
      clearStoredUserData(storage);
    }
  } catch {
    // 存储不可用时忽略，后续读取会回退到空数据。
  }
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
    ensureStoredUserDataReset(storage);
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
    ensureStoredUserDataReset(storage);
    return (storage.getItem(playerNicknameStorageKey) || "").trim();
  } catch {
    return "";
  }
}

export function savePlayerNickname(nickname: string, storage = window.localStorage): void {
  storage.setItem(playerNicknameStorageKey, nickname.trim());
}
