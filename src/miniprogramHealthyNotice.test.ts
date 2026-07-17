import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const miniprogramSource = readFileSync(
  resolve(process.cwd(), "wechat-miniprogram/miniprogram/game.js"),
  "utf8",
);
const projectConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), "wechat-miniprogram/project.config.json"), "utf8"),
);
const miniprogramLeaderboardSource = readFileSync(
  resolve(process.cwd(), "wechat-miniprogram/miniprogram/utils/leaderboard.js"),
  "utf8",
);

describe("微信小程序健康游戏忠告", () => {
  it("在加载页显示完整的四行官方文案", () => {
    expect(miniprogramSource).toContain("抵制不良游戏，拒绝盗版游戏");
    expect(miniprogramSource).toContain("注意自我保护，谨防受骗上当");
    expect(miniprogramSource).toContain("适度游戏益脑，沉迷游戏伤身");
    expect(miniprogramSource).toContain("合理安排时间，享受健康生活");
  });
});

describe("微信小程序上传加固配置", () => {
  it("上传时不携带 SourceMap 调试映射", () => {
    expect(projectConfig.setting.uploadWithSourceMap).toBe(false);
  });
});

describe("微信小程序意见线上提交", () => {
  it("小程序包里包含意见表提交接口", () => {
    expect(miniprogramLeaderboardSource).toContain("lianliankan_feedback");
    expect(miniprogramLeaderboardSource).toContain("submitOnlineFeedback");
  });
});

describe("微信小程序新玩法同步", () => {
  it("包含关卡地图、挑战模式、连击和三星评价", () => {
    expect(miniprogramSource).toContain("关卡地图");
    expect(miniprogramSource).toContain("挑战模式");
    expect(miniprogramSource).toContain("连击");
    expect(miniprogramSource).toContain("三星通关");
    expect(miniprogramSource).toContain("calculateCompletionRating");
  });
});

describe("微信小程序 iOS 审核机兼容", () => {
  it("游戏流程使用兼容定时器，避免缺少全局 setTimeout 时启动失败", () => {
    expect(miniprogramSource).toContain("safeSetTimeout");
    expect(miniprogramSource).toContain("safeSetInterval");
    expect(miniprogramSource).not.toMatch(/[^A-Za-z](setTimeout|setInterval|clearInterval)\(/);
  });
});
