const game = require("./utils/game");
const leaderboard = require("./utils/leaderboard");
const leaderboardDisplay = require("./utils/leaderboardDisplay");

const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");
const systemInfo = wx.getSystemInfoSync();
const dpr = systemInfo.pixelRatio || 1;

canvas.width = systemInfo.windowWidth * dpr;
canvas.height = systemInfo.windowHeight * dpr;
ctx.scale(dpr, dpr);

const width = systemInfo.windowWidth;
const height = systemInfo.windowHeight;
const runtimeScope =
  typeof GameGlobal !== "undefined"
    ? GameGlobal
    : typeof globalThis !== "undefined"
      ? globalThis
      : {};
const rawSetTimeout =
  typeof runtimeScope.setTimeout === "function"
    ? runtimeScope.setTimeout.bind(runtimeScope)
    : typeof wx !== "undefined" && typeof wx.setTimeout === "function"
      ? wx.setTimeout.bind(wx)
      : null;
const rawClearTimeout =
  typeof runtimeScope.clearTimeout === "function"
    ? runtimeScope.clearTimeout.bind(runtimeScope)
    : typeof wx !== "undefined" && typeof wx.clearTimeout === "function"
      ? wx.clearTimeout.bind(wx)
      : null;
const rawSetInterval =
  typeof runtimeScope.setInterval === "function"
    ? runtimeScope.setInterval.bind(runtimeScope)
    : typeof wx !== "undefined" && typeof wx.setInterval === "function"
      ? wx.setInterval.bind(wx)
      : null;
const rawClearInterval =
  typeof runtimeScope.clearInterval === "function"
    ? runtimeScope.clearInterval.bind(runtimeScope)
    : typeof wx !== "undefined" && typeof wx.clearInterval === "function"
      ? wx.clearInterval.bind(wx)
      : null;
const rawRequestAnimationFrame =
  typeof runtimeScope.requestAnimationFrame === "function"
    ? runtimeScope.requestAnimationFrame.bind(runtimeScope)
    : typeof wx !== "undefined" && typeof wx.requestAnimationFrame === "function"
      ? wx.requestAnimationFrame.bind(wx)
      : null;
const rawCancelAnimationFrame =
  typeof runtimeScope.cancelAnimationFrame === "function"
    ? runtimeScope.cancelAnimationFrame.bind(runtimeScope)
    : typeof wx !== "undefined" && typeof wx.cancelAnimationFrame === "function"
      ? wx.cancelAnimationFrame.bind(wx)
      : null;
const maxHintsPerRound = 3;
const loadingDurationMs = 3000;
const nicknameStorageKey = "guoquduiduixiao-player-nickname-v1";
const backgroundMusicStorageKey = "guoquduiduixiao-background-music-v1";
const soundEffectsStorageKey = "guoquduiduixiao-sound-effects-v1";
const feedbackStorageKey = "guoquduiduixiao-feedback-list-v1";
const feedbackPromptedStorageKey = "guoquduiduixiao-feedback-prompted-v1";
const palette = ["#f6d7e5", "#d8ecff", "#dbf2df", "#fff1cc", "#e5dcfb", "#ffdccc", "#d7eff0", "#ffe1d6"];
const praiseWords = ["好", "棒", "牛", "完美", "神了", "绝了", "太酷了"];
const praiseColors = ["#ff2f7d", "#16a34a", "#0284c7", "#f97316", "#7c3aed"];
const difficultyColors = {
  easy: { fillStart: "#d9f99d", fillEnd: "#84cc16", color: "#365314" },
  normal: { fillStart: "#bae6fd", fillEnd: "#38bdf8", color: "#075985" },
  hard: { fillStart: "#fecdd3", fillEnd: "#fb7185", color: "#7f1d1d" },
};
const tileById = game.tileDeck.reduce((map, tile, index) => {
  map[tile.id] = Object.assign({}, tile, { index });
  return map;
}, {});

let phase = "loading";
let levelIndex = 0;
let difficulty = game.levelList[levelIndex];
let playMode = "classic";
let board = game.createBoard(difficulty);
let leaderboards = leaderboard.createEmptyLeaderboards();
let leaderboardStatus = "同步中";
let savedNickname = loadSavedNickname();
let nickname = savedNickname;
let backgroundMusicEnabled = loadBooleanSetting(backgroundMusicStorageKey, true);
let soundEffectsEnabled = loadBooleanSetting(soundEffectsStorageKey, true);
let settingsOpen = false;
let banner = "开局";
let bannerTone = "neutral";
let selectedCell = null;
let hintCells = [];
let clearingCells = [];
let connectPath = [];
let hintsRemaining = maxHintsPerRound;
let moves = 0;
let seconds = 0;
let timer = null;
let loadingStartedAt = Date.now();
let loadingTimer = null;
let clickTargets = [];
let musicContext = null;
let musicGain = null;
let musicTimer = null;
let nextMusicTime = 0;
let musicNoteIndex = 0;
let musicIsQuiet = false;
let praisePop = null;
let praiseIndex = 0;
let praiseTimer = null;
let userDataCleared = false;
let completionPanel = null;
let combo = 0;
let maxCombo = 0;
let hintsUsed = 0;
let completionRating = null;

const musicBeatSeconds = 0.3;
const musicMelodySections = [
  [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 659.25, 783.99, 987.77, 783.99, 698.46, 659.25, 587.33],
  [587.33, 698.46, 880, 783.99, 659.25, 783.99, 987.77, 880, 783.99, 698.46, 659.25, 587.33, 659.25, 783.99, 880],
  [659.25, 783.99, 1046.5, 987.77, 880, 783.99, 698.46, 659.25, 587.33, 659.25, 783.99, 880, 987.77, 880, 783.99],
  [523.25, 587.33, 659.25, 783.99, 880, 987.77, 880, 783.99, 698.46, 783.99, 880, 698.46, 659.25, 587.33, 659.25],
  [698.46, 880, 1046.5, 880, 783.99, 987.77, 1174.66, 987.77, 880, 783.99, 698.46, 659.25, 698.46, 783.99, 880],
  [659.25, 698.46, 783.99, 659.25, 587.33, 659.25, 698.46, 587.33, 523.25, 587.33, 659.25, 783.99, 698.46, 659.25, 587.33],
  [783.99, 987.77, 1174.66, 987.77, 880, 783.99, 698.46, 783.99, 880, 987.77, 1046.5, 987.77, 880, 783.99, 698.46],
  [587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 587.33, 698.46, 783.99, 698.46, 659.25, 587.33, 523.25],
  [523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33, 659.25, 783.99, 880, 1046.5, 987.77, 880, 783.99],
  [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 698.46, 659.25, 587.33, 659.25, 783.99, 698.46, 659.25, 587.33, 523.25],
];
const musicMelody = [].concat.apply([], musicMelodySections);
const musicBass = [261.63, 329.63, 349.23, 392, 293.66, 349.23, 440, 392, 329.63, 293.66];
const musicFullVolume = 0.18;
const musicQuietVolume = 0.06;

function safeSetTimeout(callback, delay) {
  if (rawSetTimeout) {
    return rawSetTimeout(callback, delay);
  }

  const frameTimer = {
    cancelled: false,
    frameId: null,
  };
  const startedAt = Date.now();
  const wait = Math.max(0, Number(delay) || 0);

  const tick = () => {
    if (frameTimer.cancelled) {
      return;
    }

    if (Date.now() - startedAt >= wait || !rawRequestAnimationFrame) {
      callback();
      return;
    }

    frameTimer.frameId = rawRequestAnimationFrame(tick);
  };

  if (rawRequestAnimationFrame) {
    frameTimer.frameId = rawRequestAnimationFrame(tick);
  } else {
    callback();
  }

  return frameTimer;
}

function safeClearTimeout(timerId) {
  if (!timerId) {
    return;
  }

  if (rawClearTimeout && typeof timerId !== "object") {
    rawClearTimeout(timerId);
    return;
  }

  if (typeof timerId === "object") {
    timerId.cancelled = true;

    if (rawCancelAnimationFrame && timerId.frameId !== null) {
      rawCancelAnimationFrame(timerId.frameId);
    }
  }
}

function safeSetInterval(callback, delay) {
  if (rawSetInterval) {
    return rawSetInterval(callback, delay);
  }

  const intervalTimer = {
    cancelled: false,
    timeoutId: null,
  };

  const tick = () => {
    if (intervalTimer.cancelled) {
      return;
    }

    callback();
    intervalTimer.timeoutId = safeSetTimeout(tick, delay);
  };

  intervalTimer.timeoutId = safeSetTimeout(tick, delay);
  return intervalTimer;
}

function safeClearInterval(timerId) {
  if (!timerId) {
    return;
  }

  if (rawClearInterval && typeof timerId !== "object") {
    rawClearInterval(timerId);
    return;
  }

  if (typeof timerId === "object") {
    timerId.cancelled = true;
    safeClearTimeout(timerId.timeoutId);
  }
}

function loadSavedNickname() {
  try {
    if (!userDataCleared && (wx.getStorageSync("guoquduiduixiao-user-data-reset-v1") !== "true")) {
      leaderboard.clearStoredUserData();
      userDataCleared = true;
    }
    return String(wx.getStorageSync(nicknameStorageKey) || "").trim();
  } catch (error) {
    return "";
  }
}

function loadBooleanSetting(key, fallback) {
  try {
    const raw = wx.getStorageSync(key);
    return raw === "" || raw === undefined || raw === null ? fallback : raw === true || raw === "true";
  } catch (error) {
    return fallback;
  }
}

function saveBooleanSetting(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    // 设置保存失败不影响本局游戏。
  }
}

function saveNickname(nextNickname) {
  savedNickname = String(nextNickname || "").trim();
  nickname = savedNickname;

  try {
    wx.setStorageSync(nicknameStorageKey, savedNickname);
  } catch (error) {
    // 本地存储失败不影响本局游戏。
  }
}

function saveLocalFeedback(text) {
  try {
    const raw = wx.getStorageSync(feedbackStorageKey);
    const entries = raw ? JSON.parse(raw) : [];
    entries.push({
      nickname,
      difficulty: difficulty.id,
      level: difficulty.level,
      message: String(text || "").trim(),
      createdAt: new Date().toISOString(),
    });
    wx.setStorageSync(feedbackStorageKey, JSON.stringify(entries));
  } catch (error) {
    // 本地保存失败时只提示玩家，不影响当前对局。
  }
}

function hasPromptedForFeedback() {
  try {
    return wx.getStorageSync(feedbackPromptedStorageKey) === "true";
  } catch (error) {
    return false;
  }
}

function markFeedbackPrompted() {
  try {
    wx.setStorageSync(feedbackPromptedStorageKey, "true");
  } catch (error) {
    // 意见提示标记失败不影响玩家继续游戏。
  }
}

function validateNickname(nextNickname) {
  return leaderboard.validateNickname(nextNickname);
}

function askFeedback(isAutoPrompt = false) {
  if (isAutoPrompt) {
    markFeedbackPrompted();
  }

  wx.showModal({
    title: "意见栏",
    editable: true,
    placeholderText: isAutoPrompt ? "玩到这里，可以顺手写一点意见" : "写下想改进的地方",
    async success(response) {
      if (!response.confirm) {
        return;
      }

      const message = String(response.content || "").trim().slice(0, 200);

      if (!message) {
        wx.showToast({ title: "先写一点内容再提交", icon: "none" });
        return;
      }

      try {
        await leaderboard.submitOnlineFeedback({
          nickname,
          difficulty: difficulty.id,
          level: difficulty.level,
          message,
          createdAt: new Date().toISOString(),
        });
        wx.showToast({ title: "意见已提交", icon: "success" });
      } catch (error) {
        saveLocalFeedback(message);
        wx.showToast({ title: "网络不稳，已本地保存", icon: "none" });
      }
    },
  });
}

function getMusicContext() {
  if (musicContext) {
    return musicContext;
  }

  const hasWxWebAudio = typeof wx !== "undefined" && typeof wx.createWebAudioContext === "function";
  const AudioContextCtor =
    hasWxWebAudio
      ? null
      : typeof AudioContext !== "undefined"
        ? AudioContext
        : typeof webkitAudioContext !== "undefined"
          ? webkitAudioContext
          : null;

  try {
    musicContext = hasWxWebAudio ? wx.createWebAudioContext() : AudioContextCtor ? new AudioContextCtor() : null;
  } catch (error) {
    musicContext = null;
  }

  return musicContext;
}

function ensureMusicGain(context) {
  if (musicGain || !context) {
    return;
  }

  musicGain = context.createGain();
  musicGain.gain.value = musicFullVolume;
  musicGain.connect(context.destination);
}

function applyMusicVolume() {
  const context = getMusicContext();

  if (!context) {
    return;
  }

  ensureMusicGain(context);

  if (!musicGain) {
    return;
  }

  const nextVolume = backgroundMusicEnabled ? (musicIsQuiet ? musicQuietVolume : musicFullVolume) : 0.0001;

  if (typeof musicGain.gain.setTargetAtTime === "function") {
    musicGain.gain.setTargetAtTime(nextVolume, context.currentTime, 0.2);
  } else {
    musicGain.gain.value = nextVolume;
  }
}

function scheduleMusicTone(context, frequency, start, duration, volume, type) {
  if (!musicGain) {
    return;
  }

  const gain = context.createGain();
  const oscillator = context.createOscillator();

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.connect(gain);
  gain.connect(musicGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function scheduleMusicAhead(context) {
  while (nextMusicTime < context.currentTime + 0.8) {
    scheduleMusicTone(context, musicMelody[musicNoteIndex % musicMelody.length], nextMusicTime, musicBeatSeconds * 0.82, 0.11, "triangle");

    if (musicNoteIndex % 4 === 0) {
      scheduleMusicTone(context, musicBass[Math.floor(musicNoteIndex / 4) % musicBass.length], nextMusicTime, musicBeatSeconds * 1.7, 0.034, "sine");
    }

    musicNoteIndex += 1;
    nextMusicTime += musicBeatSeconds;
  }
}

function startBackgroundMusic(volume = musicFullVolume) {
  const context = getMusicContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended" && typeof context.resume === "function") {
    context.resume();
  }

  ensureMusicGain(context);
  musicIsQuiet = volume <= musicQuietVolume;

  applyMusicVolume();

  if (musicTimer) {
    return;
  }

  nextMusicTime = context.currentTime + 0.05;
  scheduleMusicAhead(context);
  musicTimer = safeSetInterval(() => scheduleMusicAhead(context), 150);
}

function setBackgroundMusicQuiet(isQuiet) {
  const context = getMusicContext();
  musicIsQuiet = isQuiet;

  if (!context) {
    return;
  }

  if (context.state === "suspended" && typeof context.resume === "function") {
    context.resume();
  }

  ensureMusicGain(context);

  if (!musicGain) {
    return;
  }

  applyMusicVolume();
}

function stopBackgroundMusic() {
  if (musicTimer) {
    safeClearInterval(musicTimer);
    musicTimer = null;
  }

  nextMusicTime = 0;

  if (musicGain) {
    try {
      musicGain.gain.value = 0.0001;
    } catch (error) {
      // 停止失败不影响退出流程。
    }
  }
}

function playButtonSound() {
  if (!soundEffectsEnabled) {
    return;
  }

  const context = getMusicContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended" && typeof context.resume === "function") {
    context.resume();
  }

  const now = context.currentTime;
  const gain = context.createGain();
  const oscillator = context.createOscillator();

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(720, now);
  oscillator.frequency.exponentialRampToValueAtTime(1560, now + 0.16);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.28);
}

function playMatchSound() {
  if (!soundEffectsEnabled) {
    return;
  }

  const context = getMusicContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended" && typeof context.resume === "function") {
    context.resume();
  }

  try {
    const now = context.currentTime;
    const duration = 0.22;
    const sampleCount = Math.floor(context.sampleRate * duration);
    const noiseBuffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      const decay = 1 - index / sampleCount;
      noiseData[index] = (Math.random() * 2 - 1) * decay;
    }

    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    const zap = context.createOscillator();
    const zapGain = context.createGain();
    const spark = context.createOscillator();
    const sparkGain = context.createGain();

    noise.buffer = noiseBuffer;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2300, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(7600, now + duration);
    noiseFilter.Q.setValueAtTime(8, now);

    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.24, now + 0.012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    zap.type = "sawtooth";
    zap.frequency.setValueAtTime(1300, now);
    zap.frequency.exponentialRampToValueAtTime(4200, now + 0.08);
    zap.frequency.exponentialRampToValueAtTime(880, now + duration);

    zapGain.gain.setValueAtTime(0.0001, now);
    zapGain.gain.exponentialRampToValueAtTime(0.16, now + 0.018);
    zapGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    spark.type = "square";
    spark.frequency.setValueAtTime(2800, now + 0.035);
    spark.frequency.exponentialRampToValueAtTime(6200, now + 0.13);

    sparkGain.gain.setValueAtTime(0.0001, now + 0.035);
    sparkGain.gain.exponentialRampToValueAtTime(0.11, now + 0.05);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(context.destination);
    zap.connect(zapGain);
    zapGain.connect(context.destination);
    spark.connect(sparkGain);
    sparkGain.connect(context.destination);

    noise.start(now);
    noise.stop(now + duration);
    zap.start(now);
    zap.stop(now + duration + 0.02);
    spark.start(now + 0.035);
    spark.stop(now + 0.17);
  } catch (error) {
    playButtonSound();
  }
}

function showPraisePop() {
  const index = praiseIndex;
  praiseIndex += 1;
  praisePop = {
    text: praiseWords[index % praiseWords.length],
    color: praiseColors[index % praiseColors.length],
    startedAt: Date.now(),
  };

  if (praiseTimer) {
    safeClearInterval(praiseTimer);
  }

  praiseTimer = safeSetInterval(() => {
    if (!praisePop || Date.now() - praisePop.startedAt > 900) {
      praisePop = null;
      safeClearInterval(praiseTimer);
      praiseTimer = null;
    }

    draw();
  }, 30);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const restSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

function cellKey(cell) {
  return `${cell.row}-${cell.col}`;
}

function getTileColor(tileId) {
  const index = tileById[tileId] ? tileById[tileId].index : 0;
  return palette[index % palette.length];
}

function countRemainingPairs() {
  return game.countRemainingTiles(board) / 2;
}

function getActiveLeaderboard() {
  return leaderboards[difficulty.id] || [];
}

function getNextLevelIndex() {
  return Math.min(levelIndex + 1, game.levelList.length - 1);
}

function getChallengeLevelIndex() {
  const challengeIndex = game.levelList.findIndex((level) => level.level >= 5);
  return challengeIndex === -1 ? game.levelList.length - 1 : challengeIndex;
}

function getTargetSeconds(level, challenge) {
  const base = 90 + level * 15;
  return challenge ? Math.max(60, Math.floor(base * 0.78)) : base;
}

function getTargetMoves(level, challenge) {
  const base = 34 + level * 6;
  return challenge ? Math.max(24, Math.floor(base * 0.82)) : base;
}

function calculateCompletionRating(input) {
  const targetSeconds = getTargetSeconds(input.level, input.challenge);
  const targetMoves = getTargetMoves(input.level, input.challenge);
  let stars = 1;

  if (input.seconds <= targetSeconds && input.hintsUsed <= 1) {
    stars = 2;
  }

  if (stars === 2 && input.moves <= targetMoves && input.maxCombo >= 3 && input.hintsUsed === 0) {
    stars = 3;
  }

  return { stars, targetSeconds, targetMoves };
}

function getCompletionTitle(stars) {
  if (stars >= 3) {
    return "三星通关";
  }

  if (stars === 2) {
    return "顺利通关";
  }

  return "继续加油";
}

function isShiftLevel(level) {
  return level && level.shiftMode && level.shiftMode !== "none";
}

function setBanner(text, tone = "neutral") {
  banner = text;
  bannerTone = tone;
  draw();
}

function addTarget(id, rect, data) {
  clickTargets.push(Object.assign({ id }, rect, data || {}));
}

function hitTarget(x, y) {
  return [...clickTargets].reverse().find((target) => x >= target.x && x <= target.x + target.w && y >= target.y && y <= target.y + target.h);
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCard(x, y, w, h) {
  ctx.save();
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, "rgba(255,255,255,0.96)");
  gradient.addColorStop(1, "rgba(240,252,255,0.93)");
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#d6dfeb";
  ctx.lineWidth = 1;
  roundedRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawText(text, x, y, options = {}) {
  ctx.save();
  ctx.font = `${options.weight || 700} ${options.size || 16}px ${options.font || "sans-serif"}`;
  ctx.textAlign = options.align || "left";
  ctx.textBaseline = options.baseline || "alphabetic";
  if (options.stroke) {
    ctx.lineWidth = options.strokeWidth || 4;
    ctx.strokeStyle = options.stroke;
    ctx.lineJoin = "round";
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = options.color || "#18222d";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawButton(label, x, y, w, h, options = {}) {
  ctx.save();
  if (options.fillStart || options.fillEnd) {
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, options.fillStart || options.fill || "#ffffff");
    gradient.addColorStop(1, options.fillEnd || options.fill || "#ffffff");
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = options.active ? "#fff3bf" : options.fill || "#ffffff";
  }
  ctx.strokeStyle = options.active ? "rgba(251,146,60,0.7)" : options.stroke || "#d6dfeb";
  ctx.lineWidth = 1;
  roundedRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  drawText(label, x + w / 2, y + h / 2 + 5, {
    align: "center",
    color: options.active ? options.activeColor || "#7c2d12" : options.color || "#18222d",
    size: options.size || 15,
    weight: 850,
    stroke: options.textStroke,
    strokeWidth: options.textStrokeWidth,
  });
  ctx.restore();
}

function drawSettingsButton() {
  const size = 44;
  const x = 16;
  const y = 16;
  drawButton("⚙", x, y, size, size, {
    fillStart: "#ffffff",
    fillEnd: "#dff6ff",
    color: "#0f5f9e",
    size: 20,
  });
  addTarget("settings", { x, y, w: size, h: size });
}

function drawSettingsModal() {
  if (!settingsOpen) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(14,25,36,0.45)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const modalW = Math.min(width - 40, 330);
  const modalH = 210;
  const x = (width - modalW) / 2;
  const y = (height - modalH) / 2;
  drawCard(x, y, modalW, modalH);
  drawText("设置", x + 18, y + 38, { size: 24, color: "#0f5f9e", weight: 900 });
  drawButton("×", x + modalW - 54, y + 14, 38, 38, {
    fillStart: "#fff7d6",
    fillEnd: "#fde68a",
    color: "#b45309",
    size: 20,
  });
  addTarget("settings-close", { x: x + modalW - 54, y: y + 14, w: 38, h: 38 });

  drawButton(`背景音乐：${backgroundMusicEnabled ? "开" : "关"}`, x + 18, y + 70, modalW - 36, 48, {
    fillStart: "#fff7d6",
    fillEnd: "#e9fbff",
    color: backgroundMusicEnabled ? "#15803d" : "#64748b",
  });
  addTarget("toggle-bgm", { x: x + 18, y: y + 70, w: modalW - 36, h: 48 });

  drawButton(`按键音效：${soundEffectsEnabled ? "开" : "关"}`, x + 18, y + 132, modalW - 36, 48, {
    fillStart: "#fff7d6",
    fillEnd: "#e9fbff",
    color: soundEffectsEnabled ? "#15803d" : "#64748b",
  });
  addTarget("toggle-sfx", { x: x + 18, y: y + 132, w: modalW - 36, h: 48 });
}

function drawCompletionModal() {
  if (!completionPanel) {
    return;
  }

  const rows = leaderboardDisplay.buildLeaderboardRows(getActiveLeaderboard(), 4);
  const modalW = Math.min(width - 30, 360);
  const modalH = Math.min(height - 30, 420);
  const x = (width - modalW) / 2;
  const y = (height - modalH) / 2;

  ctx.save();
  ctx.fillStyle = "rgba(14,25,36,0.45)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  drawCard(x, y, modalW, modalH);
  const rating = completionPanel.rating || { stars: 1, targetSeconds: 0, targetMoves: 0 };
  drawText(getCompletionTitle(rating.stars), x + 18, y + 34, { size: 22, color: "#0f5f9e", weight: 900 });
  drawButton("×", x + modalW - 54, y + 12, 38, 38, {
    fillStart: "#fff7d6",
    fillEnd: "#fde68a",
    color: "#b45309",
    size: 20,
  });
  addTarget("completion-close", { x: x + modalW - 54, y: y + 12, w: 38, h: 38 });

  const starText = Array.from({ length: 3 }, (_, index) => (index < rating.stars ? "★" : "☆")).join("");
  drawText(`${difficulty.label}${playMode === "challenge" ? " · 挑战模式" : ""}`, x + 18, y + 62, {
    size: 13,
    color: "#f97316",
    weight: 900,
  });
  drawText(starText, x + 18, y + 92, {
    size: 28,
    color: "#f59e0b",
    weight: 900,
  });
  drawText(`成绩 ${formatTime(completionPanel.seconds)}  ${completionPanel.moves}步`, x + 18, y + 120, {
    size: 14,
    color: "#0b5f58",
    weight: 850,
  });
  drawText(`最高连击 ${completionPanel.maxCombo}  提示 ${completionPanel.hintsUsed} 次`, x + 18, y + 142, {
    size: 13,
    color: "#5f6d7a",
    weight: 850,
  });

  const listX = x + 14;
  const listY = y + 158;
  const listW = modalW - 28;
  const listH = modalH - 218;
  drawCard(listX, listY, listW, listH);
  drawText(`${difficulty.label}排行榜`, listX + 14, listY + 26, { size: 16, color: "#0f5f9e", weight: 900 });
  drawText(leaderboardStatus, listX + listW - 14, listY + 26, { size: 12, align: "right", color: "#0b5f58", weight: 900 });

  if (rows.length === 0) {
    drawText("暂无排行", listX + listW / 2, listY + 70, { size: 14, color: "#8a96a3", align: "center" });
  } else {
    rows.forEach((row, index) => {
      const rowY = listY + 48 + index * 34;
      drawButton(`${row.rank}`, listX + 12, rowY, 28, 28, {
        fillStart: "#ffdd57",
        fillEnd: "#ff9f1c",
        color: "#fff",
        size: 13,
      });
      drawText(row.nickname, listX + 52, rowY + 20, { size: 14, weight: 850 });
      drawText(row.time, listX + listW - 84, rowY + 20, { size: 13, color: "#0b5f58", weight: 850 });
      drawText(row.moves, listX + listW - 14, rowY + 20, { size: 12, color: "#8a96a3", align: "right", weight: 850 });
    });
  }

  const buttonLabel = playMode === "challenge" ? "返回地图" : completionPanel.isFinalLevel ? "再玩一局" : "进入下一关";
  drawButton(buttonLabel, x + 18, y + modalH - 58, modalW - 36, 42, {
    fillStart: "#fff176",
    fillEnd: "#ff9f1c",
    color: "#fff",
    textStroke: "rgba(124,45,18,0.35)",
    textStrokeWidth: 3,
  });
  addTarget("completion-next", { x: x + 18, y: y + modalH - 58, w: modalW - 36, h: 42 });
}

function drawDifficultyButtons(y) {
  const gap = 8;
  const margin = 20;
  const buttonW = (width - margin * 2 - gap * 2) / 3;
  game.difficultyList.forEach((item, index) => {
    const x = margin + index * (buttonW + gap);
    const colors = difficultyColors[item.id];
    drawButton(item.label, x, y, buttonW, 42, {
      active: difficulty.id === item.id,
      fillStart: colors.fillStart,
      fillEnd: colors.fillEnd,
      color: colors.color,
      activeColor: colors.color,
    });
    addTarget("difficulty", { x, y, w: buttonW, h: 42 }, { difficultyId: item.id });
  });
}

function drawLeaderboard(y, maxRows = 5) {
  const x = 20;
  const w = width - 40;
  const rows = getActiveLeaderboard().slice(0, maxRows);
  const h = 58 + Math.max(rows.length, 1) * 34;
  drawCard(x, y, w, h);
  drawText(`${difficulty.label}排行榜`, x + 16, y + 30, { size: 18, weight: 900 });
  drawText(leaderboardStatus, x + w - 16, y + 30, { size: 12, align: "right", color: "#0b5f58", weight: 900 });

  if (rows.length === 0) {
    drawText("暂无排行", x + w / 2, y + 72, { align: "center", color: "#8a96a3", size: 14 });
    return;
  }

  rows.forEach((entry, index) => {
    const rowY = y + 58 + index * 34;
    drawText(String(index + 1), x + 18, rowY + 22, { size: 13, color: "#0b5f58", weight: 900 });
    drawText(entry.nickname, x + 46, rowY + 22, { size: 13, weight: 850 });
    drawText(formatTime(entry.seconds), x + w - 78, rowY + 22, { size: 13, color: "#0b5f58", weight: 850 });
    drawText(`${entry.moves}步`, x + w - 16, rowY + 22, { size: 12, color: "#8a96a3", align: "right", weight: 850 });
  });
}

function drawSkyField() {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#3b9be8");
  sky.addColorStop(0.52, "#aee3ff");
  sky.addColorStop(0.64, "#d9f5ff");
  sky.addColorStop(1, "#8dd036");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundedRect(width * 0.08, height * 0.18, 86, 28, 18);
  ctx.fill();
  roundedRect(width * 0.68, height * 0.38, 110, 32, 20);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#d9f7ff";
  ctx.beginPath();
  ctx.ellipse(width * 0.24, height * 0.62, width * 0.35, 70, 0, 0, Math.PI * 2);
  ctx.ellipse(width * 0.72, height * 0.62, width * 0.38, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#afe33c";
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.76, width * 0.66, height * 0.18, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLoading() {
  const progress = Math.min(1, (Date.now() - loadingStartedAt) / loadingDurationMs);
  drawSkyField();

  const logoY = height * 0.23;
  drawText("🍉", width / 2 - 92, logoY - 8, { size: 52, align: "center" });
  drawText("🫐", width / 2 + 82, logoY + 8, { size: 42, align: "center" });
  drawText("🍊", width / 2 + 116, logoY + 86, { size: 54, align: "center" });

  ctx.save();
  ctx.fillStyle = "#58d39b";
  ctx.strokeStyle = "#263238";
  ctx.lineWidth = 7;
  roundedRect(width / 2 - 132, logoY + 14, 264, 96, 24);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  drawText("果趣", width / 2, logoY + 58, {
    size: 46,
    align: "center",
    color: "#ffd43b",
    weight: 900,
    stroke: "#5b341f",
    strokeWidth: 7,
  });
  drawText("对对消", width / 2, logoY + 104, {
    size: 40,
    align: "center",
    color: "#fff7df",
    weight: 900,
    stroke: "#5b341f",
    strokeWidth: 7,
  });

  const barW = Math.min(width * 0.7, 300);
  const barX = (width - barW) / 2;
  const barY = height * 0.78;
  ctx.save();
  ctx.fillStyle = "#2d3c45";
  roundedRect(barX, barY, barW, 24, 12);
  ctx.fill();
  ctx.fillStyle = "#ffbe0b";
  roundedRect(barX + 5, barY + 5, Math.max(12, (barW - 10) * progress), 14, 8);
  ctx.fill();
  ctx.restore();

  drawText("✿", width * 0.45, height * 0.71, { size: 30, color: "#58bdf5", align: "center" });
  drawText("✿", width * 0.62, height * 0.88, { size: 35, color: "#74c0fc", align: "center" });
  drawText("抵制不良游戏，拒绝盗版游戏", width / 2, height - 72, { size: 11, color: "#286050", align: "center", weight: 850 });
  drawText("注意自我保护，谨防受骗上当", width / 2, height - 56, { size: 11, color: "#286050", align: "center", weight: 850 });
  drawText("适度游戏益脑，沉迷游戏伤身", width / 2, height - 40, { size: 11, color: "#286050", align: "center", weight: 850 });
  drawText("合理安排时间，享受健康生活", width / 2, height - 24, { size: 11, color: "#286050", align: "center", weight: 850 });

  const startW = Math.min(width * 0.72, 300);
  const startX = (width - startW) / 2;
  const startY = height * 0.68;
  if (progress >= 1) {
    drawButton("开始游戏", startX, startY, startW, 54, {
      fillStart: "#fff176",
      fillEnd: "#ff9f1c",
      color: "#ffffff",
      textStroke: "rgba(124,45,18,0.38)",
      textStrokeWidth: 4,
      size: 19,
    });
    addTarget("loading-start", { x: startX, y: startY, w: startW, h: 54 });
  } else {
    drawText("加载中...", width / 2, startY + 30, { size: 18, color: "#286050", align: "center", weight: 900 });
  }
  drawSettingsButton();
}

function drawSetup() {
  const cardX = 20;
  const cardY = 32;
  const cardW = width - 40;
  drawCard(cardX, cardY, cardW, 256);
  drawText("果趣对对消", cardX + 16, cardY + 34, { size: 15, color: "#f97316", weight: 900 });
  drawText("进入游戏", cardX + 16, cardY + 76, { size: 32, color: "#0f5f9e", weight: 900 });
  drawDifficultyButtons(cardY + 100);
  drawButton(nickname ? `昵称：${nickname}` : "输入昵称", cardX + 16, cardY + 158, cardW - 32, 42, {
    fillStart: "#ffffff",
    fillEnd: nickname ? "#dcfce7" : "#e0f2fe",
    color: nickname ? "#15803d" : "#0284c7",
  });
  addTarget("nickname", { x: cardX + 16, y: cardY + 158, w: cardW - 32, h: 42 });
  drawButton(savedNickname ? "继续游戏" : "开始游戏", cardX + 16, cardY + 212, cardW - 32, 42, {
    fillStart: "#ffe66d",
    fillEnd: "#fb8500",
    color: "#fff",
    stroke: "rgba(124,45,18,0.22)",
    textStroke: "rgba(124,45,18,0.35)",
    textStrokeWidth: 3,
  });
  addTarget("start", { x: cardX + 16, y: cardY + 212, w: cardW - 32, h: 42 });
  drawLeaderboard(cardY + 276, 6);
}

function drawDifficultySelect() {
  drawSkyField();
  drawSettingsButton();
  drawText(`玩家：${nickname}`, width / 2, 70, { size: 15, color: "#f97316", align: "center", weight: 900 });
  drawText("选择难度", width / 2, 112, {
    size: 34,
    color: "#0f5f9e",
    align: "center",
    weight: 900,
    stroke: "rgba(255,255,255,0.9)",
    strokeWidth: 4,
  });

  const margin = 16;
  const gap = 10;
  const isTall = height > width;

  game.difficultyList.forEach((item, index) => {
    const colors = difficultyColors[item.id];
    const x = isTall ? margin : margin + index * ((width - margin * 2 - gap * 2) / 3 + gap);
    const y = isTall ? 150 + index * ((height - 180 - margin - gap * 2) / 3 + gap) : 160;
    const w = isTall ? width - margin * 2 : (width - margin * 2 - gap * 2) / 3;
    const h = isTall ? (height - 180 - margin - gap * 2) / 3 : height - 190;

    drawButton(item.label, x, y, w, h, {
      fillStart: colors.fillStart,
      fillEnd: colors.fillEnd,
      color: colors.color,
      textStroke: "rgba(255,255,255,0.55)",
      textStrokeWidth: 5,
      size: Math.min(42, Math.max(26, h * 0.18)),
    });
    addTarget("choose-difficulty", { x, y, w, h }, { difficultyId: item.id });
  });
}

function drawLevelMap() {
  drawSkyField();
  drawSettingsButton();
  drawText(`玩家：${nickname}`, width - 18, 42, { size: 13, color: "#0b5f58", align: "right", weight: 900 });
  drawText("关卡地图", width / 2, 82, {
    size: 34,
    color: "#0f5f9e",
    align: "center",
    weight: 900,
    stroke: "rgba(255,255,255,0.92)",
    strokeWidth: 5,
  });
  drawText("普通推进或挑战冲三星", width / 2, 110, { size: 14, color: "#286050", align: "center", weight: 850 });

  const mapX = 18;
  const mapW = width - 36;
  const challengeY = 128;
  drawButton("挑战模式", mapX, challengeY, mapW, 66, {
    fillStart: "#fbcfe8",
    fillEnd: "#fb7185",
    color: "#ffffff",
    textStroke: "rgba(131,24,67,0.36)",
    textStrokeWidth: 4,
    size: 22,
  });
  drawText("从第5关开始，目标三星，高连击少提示", width / 2, challengeY + 50, {
    size: 12,
    color: "#831843",
    align: "center",
    weight: 850,
  });
  addTarget("map-challenge", { x: mapX, y: challengeY, w: mapW, h: 66 });

  const gap = 10;
  const columns = 2;
  const gridY = challengeY + 88;
  const levelRows = Math.ceil(game.levelList.length / columns);
  const buttonW = (mapW - gap) / columns;
  const buttonH = Math.max(44, Math.min(62, (height - gridY - 24 - gap * (levelRows - 1)) / levelRows));

  game.levelList.forEach((level, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = mapX + col * (buttonW + gap);
    const y = gridY + row * (buttonH + gap);
    const colors = difficultyColors[level.id] || difficultyColors.normal;
    const label = `开始第${level.level}关`;
    drawButton(label, x, y, buttonW, buttonH, {
      fillStart: colors.fillStart,
      fillEnd: colors.fillEnd,
      color: colors.color,
      size: 15,
    });
    drawText(level.subtitle, x + buttonW / 2, y + buttonH - 9, {
      size: 10,
      color: colors.color,
      align: "center",
      weight: 800,
    });
    addTarget("map-level", { x, y, w: buttonW, h: buttonH }, { levelIndex: index });
  });
}

function drawStats() {
  const labels = [
    ["时间", formatTime(seconds)],
    ["步数", String(moves)],
    ["剩余", `${countRemainingPairs()} 对`],
    ["连击", String(combo)],
  ];
  const gap = 8;
  const top = 104;
  const statW = (width - 40 - gap * 3) / 4;
  labels.forEach((item, index) => {
    const x = 20 + index * (statW + gap);
    drawCard(x, top, statW, 52);
    drawText(item[0], x + 10, top + 20, { size: 11, color: index === 0 ? "#0284c7" : index === 1 ? "#f97316" : "#16a34a", weight: 850 });
    drawText(item[1], x + 10, top + 42, { size: 15, color: "#1f2937", weight: 900 });
  });
}

function getBoardRect() {
  const cols = board[0] ? board[0].length : 1;
  const rows = board.length;
  const maxBoardW = width - 20;
  const maxBoardH = height - 365;
  const cell = Math.floor(Math.min(maxBoardW / cols, maxBoardH / rows));
  const boardW = cell * cols;
  const boardH = cell * rows;
  return {
    x: (width - boardW) / 2,
    y: 165,
    w: boardW,
    h: boardH,
    cell,
  };
}

function drawConnectLine(rect) {
  if (!connectPath || connectPath.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  connectPath.forEach((cell, index) => {
    const x = rect.x + (cell.col + 0.5) * rect.cell;
    const y = rect.y + (cell.row + 0.5) * rect.cell;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  ctx.restore();
}

function drawPraisePop(rect) {
  if (!praisePop) {
    return;
  }

  const elapsed = Date.now() - praisePop.startedAt;
  const progress = Math.min(1, elapsed / 900);
  const alpha = progress < 0.18 ? progress / 0.18 : progress > 0.72 ? (1 - progress) / 0.28 : 1;
  const lift = 22 + progress * 54;
  const scale = progress < 0.18 ? 0.7 + progress * 2.2 : 1.08 - progress * 0.12;
  const x = rect.x + rect.w / 2;
  const y = rect.y + rect.h * 0.36 - lift;

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate((progress - 0.5) * 0.12);
  ctx.font = `900 ${Math.max(30, Math.min(58, width * 0.12))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = praisePop.color;
  ctx.shadowColor = "rgba(249,115,22,0.35)";
  ctx.shadowBlur = 16;
  ctx.strokeText(praisePop.text, 0, 0);
  ctx.fillText(praisePop.text, 0, 0);
  ctx.restore();
}

function drawBoard() {
  const rect = getBoardRect();
  const hintKeys = new Set(hintCells.map(cellKey));
  const clearingKeys = new Set(clearingCells.map(cellKey));
  drawCard(rect.x - 8, rect.y - 8, rect.w + 16, rect.h + 16);

  board.forEach((row, rowIndex) => {
    row.forEach((tileId, colIndex) => {
      const x = rect.x + colIndex * rect.cell + 3;
      const y = rect.y + rowIndex * rect.cell + 3;
      const size = rect.cell - 6;
      const key = `${rowIndex}-${colIndex}`;
      const tile = tileId ? tileById[tileId] : null;

      ctx.save();
      ctx.globalAlpha = clearingKeys.has(key) ? 0.25 : 1;
      ctx.fillStyle = tile ? getTileColor(tileId) : "transparent";
      ctx.strokeStyle = selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex ? "#0f766e" : hintKeys.has(key) ? "#f97316" : "rgba(24,34,45,0.08)";
      ctx.lineWidth = selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex || hintKeys.has(key) ? 3 : 1;
      roundedRect(x, y, size, size, 7);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (tile) {
        drawText(tile.emoji, x + size / 2, y + size / 2 + size * 0.18, {
          align: "center",
          size: Math.max(18, Math.floor(size * 0.48)),
          weight: 700,
        });
      }

      addTarget("cell", { x, y, w: size, h: size }, { row: rowIndex, col: colIndex });
    });
  });

  drawConnectLine(rect);
  drawPraisePop(rect);
  return rect.y + rect.h + 18;
}

function drawControls(y) {
  const x = 20;
  const w = width - 40;
  drawCard(x, y, w, 176);
  drawText(banner, x + 16, y + 28, { size: 15, color: bannerTone === "good" ? "#16805f" : bannerTone === "warn" ? "#d97706" : "#5f6d7a", weight: 850 });
  drawText(`玩家：${nickname}`, x + 16, y + 56, { size: 13, color: "#5f6d7a", weight: 850 });
  const buttonW = (w - 44) / 2;
  const buttons = [
    ["hint", `提示 ${hintsRemaining}`, "#fde68a", "#f59e0b", "#78350f"],
    ["shuffle", "洗牌", "#bfdbfe", "#38bdf8", "#075985"],
    ["restart", "重开", "#fecdd3", "#fb7185", "#7f1d1d"],
    ["restart", "新一局", "#bbf7d0", "#22c55e", "#14532d"],
  ];
  buttons.forEach((button, index) => {
    const bx = x + 16 + (index % 2) * (buttonW + 12);
    const by = y + 72 + Math.floor(index / 2) * 34;
    drawButton(button[1], bx, by, buttonW, 28, {
      size: 13,
      fillStart: button[2],
      fillEnd: button[3],
      color: button[4],
    });
    addTarget(button[0], { x: bx, y: by, w: buttonW, h: 28 });
  });
  drawButton("意见", x + 16, y + 140, w - 32, 28, {
    size: 13,
    fillStart: "#fbcfe8",
    fillEnd: "#f472b6",
    color: "#831843",
  });
  addTarget("feedback", { x: x + 16, y: y + 140, w: w - 32, h: 28 });
}

function drawGame() {
  drawSettingsButton();
  drawText("果趣对对消", 70, 36, { size: 15, color: "#f97316", weight: 900 });
  drawText(difficulty.label, 70, 68, {
    size: 24,
    color: "#0f5f9e",
    weight: 900,
    stroke: "rgba(255,255,255,0.9)",
    strokeWidth: 3,
  });
  if (playMode === "challenge") {
    drawButton("挑战模式", width - 104, 34, 86, 28, {
      fillStart: "#fbcfe8",
      fillEnd: "#fb7185",
      color: "#ffffff",
      size: 12,
      textStroke: "rgba(131,24,67,0.35)",
      textStrokeWidth: 3,
    });
  }
  drawText(difficulty.subtitle || "把相同图案连起来", 70, 92, { size: 13, color: "#0b5f58", weight: 850 });
  drawStats();
  const controlsY = drawBoard();
  drawControls(controlsY);
}

function draw() {
  clickTargets = [];
  ctx.clearRect(0, 0, width, height);
  if (phase === "loading") {
    drawLoading();
    drawSettingsModal();
    return;
  }

  if (phase === "difficulty") {
    drawDifficultySelect();
    drawSettingsModal();
    return;
  }

  if (phase === "map") {
    drawLevelMap();
    drawSettingsModal();
    return;
  }

  drawSkyField();
  ctx.fillStyle = "rgba(255,255,255,0.36)";
  ctx.fillRect(0, 0, width, height);

  drawGame();
  drawCompletionModal();
  drawSettingsModal();
}

async function loadLeaderboards() {
  try {
    leaderboardStatus = "同步中";
    draw();
    leaderboards = await leaderboard.fetchOnlineLeaderboards();
    leaderboardStatus = "在线";
  } catch (error) {
    leaderboardStatus = "本地备用";
  }
  draw();
}

function resetRound(nextDifficulty = difficulty) {
  if (praiseTimer) {
    safeClearInterval(praiseTimer);
    praiseTimer = null;
  }

  board = game.createBoard(nextDifficulty);
  difficulty = nextDifficulty;
  banner = `${nextDifficulty.label}开始`;
  bannerTone = "neutral";
  selectedCell = null;
  hintCells = [];
  clearingCells = [];
  connectPath = [];
  praisePop = null;
  hintsRemaining = maxHintsPerRound;
  combo = 0;
  maxCombo = 0;
  hintsUsed = 0;
  completionRating = null;
  moves = 0;
  seconds = 0;
  if (phase === "playing") {
    setBackgroundMusicQuiet(true);
  }
  draw();
}

function showShiftRuleIfNeeded() {
  if (!isShiftLevel(difficulty)) {
    return;
  }

  wx.showModal({
    title: `${difficulty.label}规则`,
    content: game.getShiftInstructionText(difficulty.shiftMode),
    showCancel: false,
  });
}

function startTimer() {
  if (timer) {
    safeClearInterval(timer);
  }
  timer = safeSetInterval(() => {
    seconds += 1;
    draw();
  }, 1000);
}

function stopTimer() {
  if (timer) {
    safeClearInterval(timer);
    timer = null;
  }
}

function isNicknameTakenInAnyDifficulty(nextNickname) {
  return Object.keys(game.difficultyLevels).some((difficultyId) =>
    leaderboard.isNicknameTaken(leaderboards, difficultyId, nextNickname),
  );
}

function askNickname(onSaved, persist = true) {
  wx.showModal({
    title: "输入昵称",
    editable: true,
    placeholderText: "最多 12 个字",
    async success(response) {
      if (!response.confirm) {
        return;
      }
      const nextNickname = String(response.content || "").trim().slice(0, 12);
      const nicknameCheck = validateNickname(nextNickname);

      if (!nicknameCheck.ok) {
        wx.showToast({ title: nicknameCheck.message, icon: "none" });
        askNickname(onSaved, persist);
        return;
      }

      if (persist) {
        try {
          leaderboardStatus = "同步中";
          draw();
          leaderboards = await leaderboard.fetchOnlineLeaderboards();
          leaderboardStatus = "在线";
        } catch (error) {
          leaderboardStatus = "本地备用";
          wx.showToast({ title: "线上排行榜暂时连接不上", icon: "none" });
          draw();
          return;
        }

        const isSavedNickname =
          savedNickname && leaderboard.normalizeNickname(savedNickname) === leaderboard.normalizeNickname(nextNickname);

        if (!isSavedNickname && isNicknameTakenInAnyDifficulty(nextNickname)) {
          wx.showToast({ title: "当前昵称已存在，请修改", icon: "none" });
          askNickname(onSaved, persist);
          return;
        }

        saveNickname(nextNickname);
      } else {
        nickname = nextNickname;
      }
      if (onSaved) {
        onSaved();
      }
      draw();
    },
  });
}

function enterGameFromLoading() {
  if (savedNickname) {
    nickname = savedNickname;
    showLevelMap();
    return;
  }

  askNickname(() => {
    showLevelMap();
  });
}

function showLevelMap() {
  stopTimer();
  phase = "map";
  completionPanel = null;
  selectedCell = null;
  hintCells = [];
  connectPath = [];
  setBackgroundMusicQuiet(false);
  draw();
}

async function startGame(nextLevelIndex = 0, nextPlayMode = "classic") {
  if (!nickname) {
    askNickname(() => showLevelMap());
    return;
  }

  const nicknameCheck = validateNickname(nickname);

  if (!nicknameCheck.ok) {
    wx.showToast({ title: nicknameCheck.message, icon: "none" });
    askNickname(() => showLevelMap());
    return;
  }

  try {
    leaderboardStatus = "同步中";
    draw();
    leaderboards = await leaderboard.fetchOnlineLeaderboards();
    leaderboardStatus = "在线";
  } catch (error) {
    leaderboardStatus = "本地备用";
    setBanner("线上排行榜暂时连接不上，已使用本地备用", "warn");
  }

  const isSavedNickname = savedNickname && leaderboard.normalizeNickname(savedNickname) === leaderboard.normalizeNickname(nickname);

  if (!isSavedNickname && isNicknameTakenInAnyDifficulty(nickname)) {
    wx.showToast({ title: "当前昵称已存在，请修改", icon: "none" });
    askNickname(() => showLevelMap());
    return;
  }

  saveNickname(nickname);
  startBackgroundMusic(musicQuietVolume);
  setBackgroundMusicQuiet(true);
  phase = "playing";
  playMode = nextPlayMode;
  levelIndex = Math.min(Math.max(nextLevelIndex, 0), game.levelList.length - 1);
  difficulty = game.levelList[levelIndex];
  resetRound(difficulty);
  startTimer();
  showShiftRuleIfNeeded();
}

function startNextLevel() {
  levelIndex = getNextLevelIndex();
  const nextDifficulty = game.levelList[levelIndex];

  if (!nextDifficulty) {
    return;
  }

  difficulty = nextDifficulty;
  playMode = "classic";
  resetRound(nextDifficulty);
  startTimer();
  showShiftRuleIfNeeded();
}

function showCompletionLeaderboard(finalSeconds, finalMoves) {
  completionPanel = {
    seconds: finalSeconds,
    moves: finalMoves,
    maxCombo,
    hintsUsed,
    rating: completionRating,
    isFinalLevel: levelIndex >= game.levelList.length - 1,
  };
  draw();
}

function showDeadlockModal() {
  setBanner("当前无可消除块，请点击刷新", "warn");
  wx.showModal({
    title: "当前无可消除块",
    content: "请点击刷新",
    confirmText: "刷新",
    showCancel: false,
    success() {
      shuffleBoard();
    },
  });
}

function handleCell(row, col) {
  const tileId = board[row][col];
  if (!tileId || clearingCells.length > 0 || game.countRemainingTiles(board) === 0) {
    return;
  }

  const cell = { row, col };
  if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
    selectedCell = null;
    draw();
    return;
  }

  if (!selectedCell) {
    selectedCell = cell;
    hintCells = [];
    connectPath = [];
    draw();
    return;
  }

  const selectedTileId = board[selectedCell.row][selectedCell.col];
  if (!selectedTileId) {
    selectedCell = cell;
    connectPath = [];
    draw();
    return;
  }

  if (selectedTileId !== tileId) {
    selectedCell = cell;
    hintCells = [];
    connectPath = [];
    combo = 0;
    setBanner("换一个相同图案试试", "warn");
    return;
  }

  const matchedPath = game.searchConnectPath(board, selectedCell, cell);
  if (!matchedPath) {
    selectedCell = cell;
    connectPath = [];
    combo = 0;
    setBanner("这条路还不通", "warn");
    return;
  }

  const matchedCells = [selectedCell, cell];
  const nextBoard = game.applyShiftAfterRemove(
    game.removePair(board, selectedCell, cell),
    matchedCells,
    difficulty.shiftMode || "none",
  );
  const finalMoves = moves + 1;
  const nextCombo = combo + 1;
  combo = nextCombo;
  maxCombo = Math.max(maxCombo, nextCombo);
  moves = finalMoves;
  clearingCells = [selectedCell, cell];
  connectPath = matchedPath;
  selectedCell = null;
  hintCells = [];
  setBanner(nextCombo >= 2 ? `${nextCombo}连击` : "消掉一对", "good");
  showPraisePop();
  if (soundEffectsEnabled) {
    wx.vibrateShort({ type: "light" });
    playMatchSound();
  }

  safeSetTimeout(() => {
    board = isShiftLevel(difficulty) ? nextBoard : game.ensurePlayableBoard(nextBoard);
    clearingCells = [];
    connectPath = [];

    if (game.countRemainingTiles(board) === 0) {
      stopTimer();
      completionRating = calculateCompletionRating({
        level: difficulty.level,
        seconds,
        moves: finalMoves,
        hintsUsed,
        maxCombo,
        challenge: playMode === "challenge",
      });
      recordCompletion(seconds, finalMoves);
      setBackgroundMusicQuiet(false);
      setBanner("通关了，已进入排行榜", "good");
      return;
    }

    if (isShiftLevel(difficulty) && !game.findAnyMatch(board)) {
      showDeadlockModal();
      return;
    }

    draw();
  }, 160);
}

async function recordCompletion(finalSeconds, finalMoves) {
  try {
    leaderboards = await leaderboard.submitOnlineLeaderboardEntry(difficulty.id, {
      nickname,
      seconds: finalSeconds,
      moves: finalMoves,
      completedAt: new Date().toISOString(),
    });
    leaderboardStatus = "在线";
  } catch (error) {
    leaderboardStatus = "本地备用";
  }
  draw();
  showCompletionLeaderboard(finalSeconds, finalMoves);
}

function useHint() {
  if (hintsRemaining <= 0) {
    setBanner("提示已用完", "warn");
    return;
  }

  const pair = game.findAnyMatch(board);
  if (!pair) {
    if (isShiftLevel(difficulty)) {
      showDeadlockModal();
      return;
    }
    setBanner("暂时没有可连的对", "warn");
    return;
  }

  hintsRemaining -= 1;
  hintsUsed += 1;
  combo = 0;
  hintCells = [pair.start, pair.end];
  setBanner(hintsRemaining === 0 ? "提示已用完" : "提示已显示", hintsRemaining === 0 ? "warn" : "neutral");
  safeSetTimeout(() => {
    hintCells = [];
    draw();
  }, 1400);
}

function shuffleBoard() {
  const nextBoard = isShiftLevel(difficulty)
    ? game.shuffleBoardForShiftMode(board, difficulty.shiftMode)
    : game.shuffleBoard(board);
  if (isShiftLevel(difficulty) && game.countRemainingTiles(nextBoard) > 0 && !game.findAnyMatch(nextBoard)) {
    setBanner("当前无可消除块，请点击刷新", "warn");
    return;
  }

  board = nextBoard;
  selectedCell = null;
  hintCells = [];
  connectPath = [];
  combo = 0;
  setBanner(isShiftLevel(difficulty) ? "已按当前进度刷新" : "已重新整理");
}

wx.onTouchStart((event) => {
  const touch = event.touches[0];
  const target = hitTarget(touch.clientX, touch.clientY);
  if (!target) {
    return;
  }

  if (completionPanel) {
    if (target.id === "completion-close" || target.id === "completion-next") {
      const isFinalLevel = completionPanel.isFinalLevel;
      const shouldReturnMap = playMode === "challenge";
      const shouldPromptForFeedback = !shouldReturnMap && difficulty.level === 5 && !hasPromptedForFeedback();
      completionPanel = null;
      draw();
      if (shouldReturnMap) {
        showLevelMap();
      } else if (!isFinalLevel) {
        startNextLevel();
        if (shouldPromptForFeedback) {
          askFeedback(true);
        }
      } else {
        resetRound(game.levelList[levelIndex]);
        startTimer();
      }
    }
    return;
  }

  if (settingsOpen) {
    if (target.id === "settings-close") {
      settingsOpen = false;
      draw();
    } else if (target.id === "toggle-bgm") {
      backgroundMusicEnabled = !backgroundMusicEnabled;
      saveBooleanSetting(backgroundMusicStorageKey, backgroundMusicEnabled);
      applyMusicVolume();
      if (backgroundMusicEnabled) {
        startBackgroundMusic(phase === "playing" ? musicQuietVolume : musicFullVolume);
      }
      draw();
    } else if (target.id === "toggle-sfx") {
      soundEffectsEnabled = !soundEffectsEnabled;
      saveBooleanSetting(soundEffectsStorageKey, soundEffectsEnabled);
      draw();
    }
    return;
  }

  playButtonSound();

  if (target.id === "settings") {
    settingsOpen = true;
    draw();
  } else if (target.id === "loading-start") {
    startBackgroundMusic(musicFullVolume);
    enterGameFromLoading();
  } else if (target.id === "nickname") {
    askNickname();
  } else if (target.id === "start") {
    startGame();
  } else if (target.id === "map-level") {
    startGame(target.levelIndex, "classic");
  } else if (target.id === "map-challenge") {
    startGame(getChallengeLevelIndex(), "challenge");
  } else if (target.id === "cell") {
    handleCell(target.row, target.col);
  } else if (target.id === "hint") {
    useHint();
  } else if (target.id === "shuffle") {
    shuffleBoard();
  } else if (target.id === "restart") {
    resetRound(difficulty);
    startTimer();
  } else if (target.id === "feedback") {
    askFeedback();
  }
});

wx.onHide(() => {
  stopBackgroundMusic();
});

wx.onError(() => {
  stopBackgroundMusic();
});

if (typeof wx.onAudioInterruptionBegin === "function") {
  wx.onAudioInterruptionBegin(() => {
    stopBackgroundMusic();
  });
}

if (typeof wx.onShow === "function") {
  wx.onShow(() => {
    if (backgroundMusicEnabled) {
      startBackgroundMusic(phase === "playing" ? musicQuietVolume : musicFullVolume);
    }
  });
}

loadingTimer = safeSetInterval(() => {
  if (phase === "loading") {
    draw();
  }
}, 60);

startBackgroundMusic(musicFullVolume);

loadLeaderboards();
draw();
