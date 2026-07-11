import { describe, expect, it, vi } from "vitest";
import {
  fetchOnlineLeaderboards,
  getOnlineLeaderboardConfig,
  submitOnlineLeaderboardEntry,
  type OnlineLeaderboardConfig,
} from "./onlineLeaderboard";

const config: OnlineLeaderboardConfig = {
  url: "https://example.supabase.co",
  anonKey: "public-key",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(init.status === 204 ? null : JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("online leaderboard", () => {
  it("reads Supabase config from Vite env values", () => {
    expect(
      getOnlineLeaderboardConfig({
        VITE_SUPABASE_URL: " https://example.supabase.co ",
        VITE_SUPABASE_ANON_KEY: " key ",
      }),
    ).toEqual({ url: config.url, anonKey: "key" });

    expect(getOnlineLeaderboardConfig({})).toBeNull();
  });

  it("loads online rows into separate difficulty rankings", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          difficulty: "normal",
          nickname: "阿晴",
          seconds: 32,
          moves: 14,
          completed_at: "2026-07-10T00:00:00.000Z",
        },
      ]),
    );

    const leaderboards = await fetchOnlineLeaderboards(config, fetcher);

    expect(leaderboards.normal[0]).toMatchObject({ nickname: "阿晴", seconds: 32, moves: 14 });
    expect(leaderboards.easy).toHaveLength(0);
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/rest/v1/lianliankan_scores?"),
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: "public-key" }),
      }),
    );
  });

  it("updates an existing nickname only when the new score is better", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ seconds: 80, moves: 20 }]))
      .mockResolvedValueOnce(jsonResponse(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse([]));

    await submitOnlineLeaderboardEntry(
      config,
      "easy",
      { nickname: "小云", seconds: 60, moves: 22, completedAt: "2026-07-10T00:00:00.000Z" },
      fetcher,
    );

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("difficulty=eq.easy&nickname_key=eq."),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("does not overwrite an existing nickname with a worse score", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ seconds: 40, moves: 10 }]))
      .mockResolvedValueOnce(jsonResponse([]));

    await submitOnlineLeaderboardEntry(
      config,
      "normal",
      { nickname: "小云", seconds: 60, moves: 22, completedAt: "2026-07-10T00:00:00.000Z" },
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).not.toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "PATCH" }));
  });
});
