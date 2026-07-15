import { describe, expect, it, vi } from "vitest";
import { submitOnlineFeedback, type OnlineFeedbackEntry } from "./onlineFeedback";
import { type OnlineLeaderboardConfig } from "./onlineLeaderboard";

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

describe("online feedback", () => {
  it("submits player feedback to Supabase", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(null, { status: 204 }));
    const entry: OnlineFeedbackEntry = {
      nickname: "PlayerOne",
      difficulty: "hard",
      level: 5,
      message: "第五关有点难，可以加一点说明",
      createdAt: "2026-07-14T00:00:00.000Z",
    };

    await submitOnlineFeedback(config, entry, fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/lianliankan_feedback",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "public-key",
          Authorization: "Bearer public-key",
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        }),
        body: JSON.stringify({
          nickname: "PlayerOne",
          nickname_key: "playerone",
          difficulty: "hard",
          level: 5,
          message: "第五关有点难，可以加一点说明",
          created_at: "2026-07-14T00:00:00.000Z",
        }),
      }),
    );
  });

  it("rejects empty feedback before talking to Supabase", async () => {
    const fetcher = vi.fn();

    await expect(
      submitOnlineFeedback(
        config,
        {
          nickname: "PlayerOne",
          difficulty: "normal",
          level: 2,
          message: "   ",
          createdAt: "2026-07-14T00:00:00.000Z",
        },
        fetcher,
      ),
    ).rejects.toThrow("意见内容不能为空");

    expect(fetcher).not.toHaveBeenCalled();
  });
});
