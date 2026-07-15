import { type DifficultyId } from "./game";
import { normalizeNickname, validateNickname } from "./leaderboard";
import { type OnlineLeaderboardConfig } from "./onlineLeaderboard";

export type OnlineFeedbackEntry = {
  nickname: string;
  difficulty: DifficultyId;
  level: number;
  message: string;
  createdAt: string;
};

type Fetcher = typeof fetch;

const feedbackTable = "lianliankan_feedback";

function getHeaders(config: OnlineLeaderboardConfig, extra: HeadersInit = {}): HeadersInit {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    ...extra,
  };
}

function getTableUrl(config: OnlineLeaderboardConfig): string {
  return `${config.url}/rest/v1/${feedbackTable}`;
}

async function readSupabaseResponse(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }
}

export async function submitOnlineFeedback(
  config: OnlineLeaderboardConfig,
  entry: OnlineFeedbackEntry,
  fetcher: Fetcher = fetch,
): Promise<void> {
  const nicknameCheck = validateNickname(entry.nickname);

  if (!nicknameCheck.ok) {
    throw new Error(nicknameCheck.message);
  }

  const message = entry.message.trim();

  if (!message) {
    throw new Error("意见内容不能为空");
  }

  const response = await fetcher(getTableUrl(config), {
    method: "POST",
    headers: getHeaders(config, {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify({
      nickname: entry.nickname.trim(),
      nickname_key: normalizeNickname(entry.nickname),
      difficulty: entry.difficulty,
      level: entry.level,
      message,
      created_at: entry.createdAt,
    }),
  });

  await readSupabaseResponse(response);
}
