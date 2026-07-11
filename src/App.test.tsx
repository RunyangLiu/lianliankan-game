import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { levelList, tileDeck } from "./game";
import { playMatchSound } from "./sound";

vi.mock("./game", async () => {
  const actual = await vi.importActual<typeof import("./game")>("./game");

  function makeBoard(rows: number, cols: number) {
    const pairCount = (rows * cols) / 2;
    const tiles = Array.from({ length: pairCount }, (_, index) => actual.tileDeck[index % actual.tileDeck.length].id).flatMap(
      (tile) => [tile, tile],
    );

    return Array.from({ length: rows }, (_, row) => tiles.slice(row * cols, row * cols + cols));
  }

  return {
    ...actual,
    createBoard: (difficulty = actual.difficultyLevels.normal) => makeBoard(difficulty.rows, difficulty.cols),
  };
});

vi.mock("./sound", () => ({
  playMatchSound: vi.fn(),
  setBackgroundMusicQuiet: vi.fn(),
  startBackgroundMusic: vi.fn(),
  stopBackgroundMusic: vi.fn(),
}));

describe("App", () => {
  afterEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  async function startGame(name = "玩家一") {
    const user = userEvent.setup();
    render(<App loadingMs={0} />);
    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await user.type(screen.getByLabelText("昵称"), name);
    await user.click(screen.getByRole("button", { name: "确认昵称" }));
    return user;
  }

  it("shows a loading start button before the nickname flow", () => {
    render(<App loadingMs={0} />);

    expect(screen.getByLabelText("果趣对对消加载中")).toBeVisible();
    expect(screen.getByRole("button", { name: "开始游戏" })).toBeVisible();
  });

  it("places the loading start button above the progress bar", () => {
    render(<App loadingMs={0} />);

    const startButton = screen.getByRole("button", { name: "开始游戏" });
    const loadingBar = screen.getByRole("progressbar", { name: "加载进度" });

    expect(startButton.compareDocumentPosition(loadingBar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("asks for a nickname on first start", async () => {
    const user = userEvent.setup();
    render(<App loadingMs={0} />);

    await user.click(screen.getByRole("button", { name: "开始游戏" }));

    expect(screen.getByRole("heading", { name: "输入昵称" })).toBeVisible();
    expect(screen.getByLabelText("昵称")).toBeVisible();
    expect(screen.getByRole("button", { name: "确认昵称" })).toBeVisible();
  });

  it("rejects a duplicate nickname before difficulty selection", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "lianliankan-leaderboards-v1",
      JSON.stringify({
        easy: [],
        normal: [{ nickname: "阿晴", seconds: 30, moves: 10, completedAt: "2026-07-10T00:00:00.000Z" }],
        hard: [],
      }),
    );

    render(<App loadingMs={0} />);

    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await user.type(screen.getByLabelText("昵称"), "阿晴");
    await user.click(screen.getByRole("button", { name: "确认昵称" }));

    expect(screen.getByText("当前昵称已存在，请修改")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "第1关" })).not.toBeInTheDocument();
  });

  it("saves the nickname after confirmation and skips nickname next time", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App loadingMs={0} />);

    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await user.type(screen.getByLabelText("昵称"), "彩果新人");
    await user.click(screen.getByRole("button", { name: "确认昵称" }));

    expect(screen.getByRole("heading", { name: "第1关" })).toBeVisible();
    expect(window.localStorage.getItem("guoquduiduixiao-player-nickname-v1")).toBe("彩果新人");

    unmount();
    render(<App loadingMs={0} />);
    await user.click(screen.getByRole("button", { name: "开始游戏" }));

    expect(screen.getByRole("heading", { name: "第1关" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "输入昵称" })).not.toBeInTheDocument();
  });

  it("reuses the saved nickname and lets the same player continue", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("guoquduiduixiao-player-nickname-v1", "阿晴");
    window.localStorage.setItem(
      "lianliankan-leaderboards-v1",
      JSON.stringify({
        easy: [],
        normal: [{ nickname: "阿晴", seconds: 30, moves: 10, completedAt: "2026-07-10T00:00:00.000Z" }],
        hard: [],
      }),
    );

    render(<App loadingMs={0} />);

    await user.click(screen.getByRole("button", { name: "开始游戏" }));

    expect(screen.getByRole("heading", { name: "第1关" })).toBeVisible();
    expect(screen.getAllByText("阿晴").length).toBeGreaterThan(0);
  });

  it("opens settings and toggles the two sound switches", async () => {
    const user = userEvent.setup();
    render(<App loadingMs={0} />);

    await user.click(screen.getByRole("button", { name: "设置" }));

    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
    await user.click(screen.getByRole("switch", { name: "背景音乐 开" }));
    await user.click(screen.getByRole("switch", { name: "按键音效 开" }));

    expect(screen.getByRole("switch", { name: "背景音乐 关" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "按键音效 关" })).toHaveAttribute("aria-checked", "false");
  });

  it("renders the game shell and controls after entering a nickname", async () => {
    await startGame();

    expect(screen.getByRole("heading", { name: "第1关" })).toBeVisible();
    expect(screen.getByRole("button", { name: "提示 3" })).toBeVisible();
    expect(screen.getByRole("button", { name: "刷新" })).toBeVisible();
    expect(screen.getByText("10 对")).toBeVisible();
  });

  it("does not render the old difficulty picker", async () => {
    const user = await startGame();

    expect(screen.queryByRole("button", { name: "简单" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "一般" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "困难" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重开" }));
    expect(screen.getByText("开局")).toBeVisible();
  });

  it("removes a matched pair and updates the round counters", async () => {
    const user = await startGame();

    const pairLabel = tileDeck[0].label;
    const pairButtons = screen.getAllByRole("button", { name: pairLabel });

    expect(pairButtons.length).toBeGreaterThanOrEqual(2);

    await user.click(pairButtons[0]);
    await user.click(pairButtons[1]);

    expect(await screen.findByText("消掉一对")).toBeVisible();
    expect(screen.getByTestId("connect-line")).toBeVisible();
    expect(await screen.findByTestId("praise-pop")).toHaveTextContent(/^(好|棒|牛|完美|神了|绝了|太酷了)$/);
    await waitFor(() => expect(screen.getByText("9 对")).toBeVisible());
    expect(playMatchSound).toHaveBeenCalled();
  });

  it("limits hints to three times in one round", async () => {
    const user = await startGame();
    const hintButton = screen.getByRole("button", { name: "提示 3" });

    await user.click(hintButton);
    expect(screen.getByRole("button", { name: "提示 2" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "提示 2" }));
    expect(screen.getByRole("button", { name: "提示 1" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "提示 1" }));
    expect(screen.getByRole("button", { name: "提示 0" })).toBeDisabled();
    expect(screen.getByText("提示已用完")).toBeVisible();
  });

  it("restores three hints when restarting the round", async () => {
    const user = await startGame();

    await user.click(screen.getByRole("button", { name: "提示 3" }));
    await user.click(screen.getByRole("button", { name: "重开" }));

    expect(screen.getByRole("button", { name: "提示 3" })).toBeVisible();
  });

  it("restarts the round with a full board", async () => {
    const user = await startGame();

    const pairLabel = tileDeck[0].label;
    const pairButtons = screen.getAllByRole("button", { name: pairLabel });

    await user.click(pairButtons[0]);
    await user.click(pairButtons[1]);
    await screen.findByText("消掉一对");

    await user.click(screen.getByRole("button", { name: "重开" }));

    await waitFor(() => expect(screen.getByText("10 对")).toBeVisible());
    expect(screen.getByText("开局")).toBeVisible();
  });

  it("shows the movement rule when entering a later shift level", async () => {
    const user = userEvent.setup();
    const levelFive = levelList[4];

    render(<App loadingMs={0} initialLevelIndex={4} />);

    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await user.type(screen.getByLabelText("昵称"), "移动测试");
    await user.click(screen.getByRole("button", { name: "确认昵称" }));

    expect(screen.getByRole("dialog", { name: "关卡规则提示" })).toBeVisible();
    expect(screen.getByText(`${levelFive.label}规则`)).toBeVisible();
    expect(screen.getByText("消除后会向左移动")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "知道了" }));

    expect(screen.queryByRole("dialog", { name: "关卡规则提示" })).not.toBeInTheDocument();
  });
});
