import {
  addLeaderboardEntry,
  createEmptyLeaderboards,
  normalizeNickname,
  validateNickname,
  type LeaderboardEntry,
  type Leaderboards,
} from "./leaderboard";
import { type DifficultyId } from "./game";

export type OnlineLeaderboardConfig = {
  url: string;
  anonKey: string;
};

type EnvValues = {
  readonly [key: string]: string | boolean | undefined;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

type Fetcher = typeof fetch;

type SupabaseScoreRow = {
  difficulty: DifficultyId;
  nickname: string;
  nickname_key?: string;
  seconds: number;
  moves: number;
  completed_at: string;
};

type ExistingScoreRow = {
  seconds: number;
  moves: number;
};

const scoresTable = "lianliankan_scores";

export function getOnlineLeaderboardConfig(env: EnvValues = import.meta.env): OnlineLeaderboardConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    anonKey,
  };
}

function getHeaders(config: OnlineLeaderboardConfig, extra: HeadersInit = {}): HeadersInit {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    ...extra,
  };
}

function getTableUrl(config: OnlineLeaderboardConfig, query = ""): string {
  return `${config.url}/rest/v1/${scoresTable}${query}`;
}

function encodeFilterValue(value: string): string {
  return encodeURIComponent(value);
}

function rowToEntry(row: SupabaseScoreRow): LeaderboardEntry {
  return {
    nickname: row.nickname,
    seconds: row.seconds,
    moves: row.moves,
    completedAt: row.completed_at,
  };
}

function isBetterScore(entry: LeaderboardEntry, current: ExistingScoreRow): boolean {
  return entry.seconds < current.seconds || (entry.seconds === current.seconds && entry.moves < current.moves);
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchOnlineLeaderboards(
  config: OnlineLeaderboardConfig,
  fetcher: Fetcher = fetch,
): Promise<Leaderboards> {
  const query = "?select=difficulty,nickname,seconds,moves,completed_at&order=difficulty.asc&order=seconds.asc&order=moves.asc";
  const response = await fetcher(getTableUrl(config, query), {
    headers: getHeaders(config),
  });
  const rows = await readJson<SupabaseScoreRow[]>(response);

  return rows.reduce((leaderboards, row) => {
    return addLeaderboardEntry(leaderboards, row.difficulty, rowToEntry(row));
  }, createEmptyLeaderboards());
}

export async function submitOnlineLeaderboardEntry(
  config: OnlineLeaderboardConfig,
  difficultyId: DifficultyId,
  entry: LeaderboardEntry,
  fetcher: Fetcher = fetch,
): Promise<Leaderboards> {
  const nicknameCheck = validateNickname(entry.nickname);

  if (!nicknameCheck.ok) {
    throw new Error(nicknameCheck.message);
  }

  const nicknameKey = normalizeNickname(entry.nickname);
  const filter = `difficulty=eq.${encodeFilterValue(difficultyId)}&nickname_key=eq.${encodeFilterValue(nicknameKey)}`;
  const existingResponse = await fetcher(getTableUrl(config, `?select=seconds,moves&${filter}&limit=1`), {
    headers: getHeaders(config),
  });
  const existingRows = await readJson<ExistingScoreRow[]>(existingResponse);
  const existing = existingRows[0];

  if (!existing) {
    const insertResponse = await fetcher(getTableUrl(config), {
      method: "POST",
      headers: getHeaders(config, {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      }),
      body: JSON.stringify({
        difficulty: difficultyId,
        nickname: entry.nickname,
        nickname_key: nicknameKey,
        seconds: entry.seconds,
        moves: entry.moves,
        completed_at: entry.completedAt,
      }),
    });

    await readJson<null>(insertResponse);
    return fetchOnlineLeaderboards(config, fetcher);
  }

  if (isBetterScore(entry, existing)) {
    const updateResponse = await fetcher(getTableUrl(config, `?${filter}`), {
      method: "PATCH",
      headers: getHeaders(config, {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      }),
      body: JSON.stringify({
        nickname: entry.nickname,
        seconds: entry.seconds,
        moves: entry.moves,
        completed_at: entry.completedAt,
      }),
    });

    await readJson<null>(updateResponse);
  }

  return fetchOnlineLeaderboards(config, fetcher);
}
