import { Lightbulb, MessageSquareText, RotateCcw, Settings, Shuffle, TimerReset, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  applyShiftAfterRemove,
  countAvailableMatches,
  countRemainingTiles,
  createBoard,
  difficultyList,
  ensurePlayableBoard,
  findAnyMatch,
  getShiftInstructionText,
  levelList,
  removePair,
  searchConnectPath,
  shuffleBoard,
  shuffleBoardForShiftMode,
  tileDeck,
  type Board,
  type Cell,
  type LevelConfig,
} from "./game";
import {
  addLeaderboardEntry,
  isNicknameTaken,
  loadPlayerNickname,
  loadLeaderboards,
  normalizeNickname,
  saveLeaderboards,
  savePlayerNickname,
  validateNickname,
  type LeaderboardEntry,
  type Leaderboards,
} from "./leaderboard";
import {
  fetchOnlineLeaderboards,
  getOnlineLeaderboardConfig,
  submitOnlineLeaderboardEntry,
} from "./onlineLeaderboard";
import { submitOnlineFeedback } from "./onlineFeedback";
import {
  calculateCompletionRating,
  getChallengeLevel,
  getCompletionTitle,
  nextComboAfterMatch,
  type CompletionRating,
} from "./progression";
import { playMatchSound, setBackgroundMusicQuiet, startBackgroundMusic, stopBackgroundMusic } from "./sound";

type BannerTone = "neutral" | "good" | "warn";

type Banner = {
  text: string;
  tone: BannerTone;
};

const tileById = new Map(tileDeck.map((tile, index) => [tile.id, { ...tile, index }]));

const palette = [
  "#f6d7e5",
  "#d8ecff",
  "#dbf2df",
  "#fff1cc",
  "#e5dcfb",
  "#ffdccc",
  "#d7eff0",
  "#ffe1d6",
];

const initialBanner: Banner = {
  text: "开局",
  tone: "neutral",
};

const maxHintsPerRound = 3;
const praiseWords = ["好", "棒", "牛", "完美", "神了", "绝了", "太酷了"] as const;
const backgroundMusicStorageKey = "guoquduiduixiao-background-music-v1";
const soundEffectsStorageKey = "guoquduiduixiao-sound-effects-v1";
const feedbackPromptedStorageKey = "guoquduiduixiao-feedback-prompted-v1";
const feedbackStorageKey = "guoquduiduixiao-feedback-list-v1";

type GamePhase = "loading" | "nickname" | "map" | "playing";
type PlayMode = "classic" | "challenge";

type LeaderboardStatus = "local" | "loading" | "online" | "error";

function loadBooleanSetting(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw === "true";
  } catch {
    return fallback;
  }
}

function saveBooleanSetting(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // 设置保存失败不影响本局游戏。
  }
}

function hasPromptedForFeedback(): boolean {
  try {
    return window.localStorage.getItem(feedbackPromptedStorageKey) === "true";
  } catch {
    return false;
  }
}

function markFeedbackPrompted() {
  try {
    window.localStorage.setItem(feedbackPromptedStorageKey, "true");
  } catch {
    // 提示记录失败不影响继续游戏。
  }
}

function saveFeedbackText(text: string) {
  try {
    const raw = window.localStorage.getItem(feedbackStorageKey);
    const entries = raw ? (JSON.parse(raw) as string[]) : [];
    window.localStorage.setItem(feedbackStorageKey, JSON.stringify([...entries, text]));
  } catch {
    // 意见保存失败时只保留页面提示，避免中断玩家流程。
  }
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function cellKey(cell: Cell): string {
  return `${cell.row}-${cell.col}`;
}

function getTileColor(tileId: string): string {
  const index = tileById.get(tileId)?.index ?? 0;
  return palette[index % palette.length];
}

function isNicknameTakenInAnyDifficulty(leaderboards: Leaderboards, nickname: string): boolean {
  return difficultyList.some((difficulty) => isNicknameTaken(leaderboards, difficulty.id, nickname));
}

function connectPathToSvgPath(path: Cell[]): string {
  return path
    .map((cell, index) => `${index === 0 ? "M" : "L"} ${cell.col + 0.5} ${cell.row + 0.5}`)
    .join(" ");
}

export function App({
  loadingMs: _loadingMs = 3000,
  initialLevelIndex = 0,
}: {
  loadingMs?: number;
  initialLevelIndex?: number;
} = {}) {
  const startingLevelIndex = Math.min(Math.max(initialLevelIndex, 0), levelList.length - 1);
  const startingDifficulty = levelList[startingLevelIndex];
  const [levelIndex, setLevelIndex] = useState(startingLevelIndex);
  const [difficulty, setDifficulty] = useState<LevelConfig>(startingDifficulty);
  const [board, setBoard] = useState<Board>(() => createBoard(startingDifficulty));
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [loadingComplete, setLoadingComplete] = useState(_loadingMs <= 0);
  const [savedNickname, setSavedNickname] = useState(() => loadPlayerNickname());
  const [nicknameInput, setNicknameInput] = useState(() => loadPlayerNickname());
  const [playerName, setPlayerName] = useState("");
  const [setupError, setSetupError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(() => loadBooleanSetting(backgroundMusicStorageKey, true));
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => loadBooleanSetting(soundEffectsStorageKey, true));
  const [leaderboards, setLeaderboards] = useState<Leaderboards>(() => loadLeaderboards());
  const [leaderboardStatus, setLeaderboardStatus] = useState<LeaderboardStatus>(() =>
    getOnlineLeaderboardConfig() ? "loading" : "local",
  );
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [hintCells, setHintCells] = useState<Cell[] | null>(null);
  const [clearingCells, setClearingCells] = useState<Cell[] | null>(null);
  const [connectPath, setConnectPath] = useState<Cell[] | null>(null);
  const [banner, setBanner] = useState<Banner>(initialBanner);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(maxHintsPerRound);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [deadlockModalOpen, setDeadlockModalOpen] = useState(false);
  const [shiftRuleLevel, setShiftRuleLevel] = useState<LevelConfig | null>(null);
  const [praisePop, setPraisePop] = useState<{ id: number; text: string; variant: number } | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [playMode, setPlayMode] = useState<PlayMode>("classic");
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [completionRating, setCompletionRating] = useState<CompletionRating | null>(null);

  const clearTimerRef = useRef<number | null>(null);
  const hintTimerRef = useRef<number | null>(null);
  const praiseTimerRef = useRef<number | null>(null);
  const praiseIndexRef = useRef(0);
  const onlineLeaderboardConfig = useMemo(() => getOnlineLeaderboardConfig(), []);

  const remainingTiles = useMemo(() => countRemainingTiles(board), [board]);
  const remainingPairs = remainingTiles / 2;
  const isComplete = remainingTiles === 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingComplete(true), _loadingMs);
    return () => window.clearTimeout(timer);
  }, [_loadingMs]);

  useEffect(() => {
    saveBooleanSetting(backgroundMusicStorageKey, backgroundMusicEnabled);

    if (!backgroundMusicEnabled) {
      void stopBackgroundMusic();
      return;
    }

    if (phase === "playing" && !isComplete) {
      void startBackgroundMusic();
      void setBackgroundMusicQuiet(true);
      return;
    }

    void startBackgroundMusic();
    void setBackgroundMusicQuiet(false);
  }, [backgroundMusicEnabled, isComplete, phase]);

  useEffect(() => {
    const stopAudio = () => {
      void stopBackgroundMusic();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopAudio();
      }
    };

    window.addEventListener("pagehide", stopAudio);
    window.addEventListener("beforeunload", stopAudio);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", stopAudio);
      window.removeEventListener("beforeunload", stopAudio);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopAudio();
    };
  }, []);

  useEffect(() => {
    saveBooleanSetting(soundEffectsStorageKey, soundEffectsEnabled);
  }, [soundEffectsEnabled]);

  useEffect(() => {
    if (phase !== "playing" || isComplete) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isComplete, phase]);

  useEffect(() => {
    if (!onlineLeaderboardConfig) {
      return;
    }

    const config = onlineLeaderboardConfig;
    let isActive = true;

    async function loadOnlineLeaderboards() {
      try {
        setLeaderboardStatus("loading");
        const onlineLeaderboards = await fetchOnlineLeaderboards(config);

        if (!isActive) {
          return;
        }

        setLeaderboards(onlineLeaderboards);
        setLeaderboardStatus("online");
      } catch {
        if (!isActive) {
          return;
        }

        setLeaderboardStatus("error");
      }
    }

    void loadOnlineLeaderboards();

    return () => {
      isActive = false;
    };
  }, [onlineLeaderboardConfig]);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }

      if (hintTimerRef.current) {
        window.clearTimeout(hintTimerRef.current);
      }

      if (praiseTimerRef.current) {
        window.clearTimeout(praiseTimerRef.current);
      }
    };
  }, []);

  function showPraisePop() {
    const nextIndex = praiseIndexRef.current;
    const text = praiseWords[nextIndex % praiseWords.length];
    praiseIndexRef.current = nextIndex + 1;

    if (praiseTimerRef.current) {
      window.clearTimeout(praiseTimerRef.current);
    }

    setPraisePop({ id: nextIndex, text, variant: nextIndex % 5 });
    praiseTimerRef.current = window.setTimeout(() => {
      setPraisePop(null);
      praiseTimerRef.current = null;
    }, 900);
  }

  useEffect(() => {
    if (isComplete) {
      setBanner({ text: "通关了", tone: "good" });
    }
  }, [isComplete]);

  function resetRound(nextDifficulty = difficulty, nextBanner = initialBanner) {
    if (clearTimerRef.current) {
      window.clearTimeout(clearTimerRef.current);
    }

    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current);
    }

    if (praiseTimerRef.current) {
      window.clearTimeout(praiseTimerRef.current);
      praiseTimerRef.current = null;
    }

    setBoard(createBoard(nextDifficulty));
    setSelectedCell(null);
    setHintCells(null);
    setClearingCells(null);
    setConnectPath(null);
    setPraisePop(null);
    setBanner(nextBanner);
    setMoves(0);
    setSeconds(0);
    setHintsRemaining(maxHintsPerRound);
    setCombo(0);
    setMaxCombo(0);
    setHintsUsed(0);
    setCompletionRating(null);
    setCompletionModalOpen(false);
    setDeadlockModalOpen(false);
    setShiftRuleLevel(null);
  }

  function handleLoadingStart() {
    if (!loadingComplete) {
      return;
    }

    if (backgroundMusicEnabled) {
      void startBackgroundMusic();
    }

    const currentNickname = loadPlayerNickname();

    if (currentNickname) {
      setSavedNickname(currentNickname);
      setNicknameInput(currentNickname);
      setPlayerName(currentNickname);
      setPhase("map");
      return;
    }

    setPhase("nickname");
  }

  async function handleNicknameSubmit() {
    const nextName = nicknameInput.trim();

    const nicknameCheck = validateNickname(nextName);

    if (!nicknameCheck.ok) {
      setSetupError(nicknameCheck.message);
      return;
    }

    let currentLeaderboards = leaderboards;

    if (onlineLeaderboardConfig) {
      try {
        setLeaderboardStatus("loading");
        currentLeaderboards = await fetchOnlineLeaderboards(onlineLeaderboardConfig);
        setLeaderboards(currentLeaderboards);
        setLeaderboardStatus("online");
      } catch {
        setLeaderboardStatus("error");
        currentLeaderboards = loadLeaderboards();
      }
    }

    const currentSavedNickname = savedNickname || loadPlayerNickname();
    const isSavedNickname =
      currentSavedNickname && normalizeNickname(currentSavedNickname) === normalizeNickname(nextName);

    if (!isSavedNickname && isNicknameTakenInAnyDifficulty(currentLeaderboards, nextName)) {
      setSetupError("当前昵称已存在，请修改");
      return;
    }

    savePlayerNickname(nextName);
    setSavedNickname(nextName);
    setPlayerName(nextName);
    setNicknameInput(nextName);
    setSetupError("");
    setPhase("map");
  }

  async function handleStartGame(nextDifficulty: LevelConfig = difficulty, forcedName?: string, nextPlayMode: PlayMode = "classic") {
    const nextName = (forcedName || playerName || savedNickname || nicknameInput).trim();
    const nicknameCheck = validateNickname(nextName);

    if (!nicknameCheck.ok) {
      setPhase("nickname");
      setSetupError(nicknameCheck.message);
      return;
    }

    let currentLeaderboards = leaderboards;

    if (onlineLeaderboardConfig) {
      try {
        setLeaderboardStatus("loading");
        currentLeaderboards = await fetchOnlineLeaderboards(onlineLeaderboardConfig);
        setLeaderboards(currentLeaderboards);
        setLeaderboardStatus("online");
      } catch {
        setLeaderboardStatus("error");
        currentLeaderboards = loadLeaderboards();
      }
    }

    const isSavedNickname = savedNickname && normalizeNickname(savedNickname) === normalizeNickname(nextName);

    if (!isSavedNickname && isNicknameTaken(currentLeaderboards, nextDifficulty.id, nextName)) {
      setSetupError("当前昵称已存在，请修改");
      setPhase("nickname");
      return;
    }

    savePlayerNickname(nextName);
    setSavedNickname(nextName);
    setPlayerName(nextName);
    setSetupError("");
    setPlayMode(nextPlayMode);
    setDifficulty(nextDifficulty);
    setLevelIndex(nextDifficulty.level - 1);
    if (backgroundMusicEnabled) {
      void startBackgroundMusic();
      void setBackgroundMusicQuiet(true);
    }
    resetRound(nextDifficulty);
    setPhase("playing");
    if (nextDifficulty.shiftMode !== "none") {
      setShiftRuleLevel(nextDifficulty);
    }
  }

  function handleChallengeStart() {
    void handleStartGame(getChallengeLevel(levelList), undefined, "challenge");
  }

  async function recordCompletion(finalSeconds: number, finalMoves: number) {
    const entry: LeaderboardEntry = {
      nickname: playerName,
      seconds: finalSeconds,
      moves: finalMoves,
      completedAt: new Date().toISOString(),
    };

    if (onlineLeaderboardConfig) {
      try {
        const nextLeaderboards = await submitOnlineLeaderboardEntry(onlineLeaderboardConfig, difficulty.id, entry);
        setLeaderboards(nextLeaderboards);
        setLeaderboardStatus("online");
        return;
      } catch {
        setLeaderboardStatus("error");
      }
    }

    const nextLeaderboards = addLeaderboardEntry(leaderboards, difficulty.id, entry);
    setLeaderboards(nextLeaderboards);
    saveLeaderboards(nextLeaderboards);
  }

  function getNextLevel(): LevelConfig {
    return levelList[Math.min(levelIndex + 1, levelList.length - 1)];
  }

  function openFeedbackDialog(isAutoPrompt = false) {
    if (isAutoPrompt) {
      markFeedbackPrompted();
      setFeedbackMessage("玩到这里，可以顺手写一点意见。");
    } else {
      setFeedbackMessage("");
    }

    setFeedbackOpen(true);
  }

  function closeFeedbackDialog() {
    setFeedbackOpen(false);
    setFeedbackMessage("");
  }

  async function handleFeedbackSubmit() {
    const text = feedbackText.trim();

    if (!text) {
      setFeedbackMessage("先写一点内容再提交");
      return;
    }

    if (onlineLeaderboardConfig) {
      try {
        await submitOnlineFeedback(onlineLeaderboardConfig, {
          nickname: playerName,
          difficulty: difficulty.id,
          level: difficulty.level,
          message: text,
          createdAt: new Date().toISOString(),
        });
      } catch {
        saveFeedbackText(text);
      }
    } else {
      saveFeedbackText(text);
    }

    setFeedbackText("");
    setFeedbackMessage("已收到，后面会按玩家反馈继续改。");
  }

  function handleNextLevel() {
    if (playMode === "challenge") {
      setCompletionModalOpen(false);
      setPhase("map");
      void setBackgroundMusicQuiet(false);
      return;
    }

    const nextLevel = getNextLevel();
    const shouldPromptForFeedback = difficulty.level === 5 && !hasPromptedForFeedback();

    setCompletionModalOpen(false);
    void handleStartGame(nextLevel).then(() => {
      if (shouldPromptForFeedback) {
        openFeedbackDialog(true);
      }
    });
  }

  function handleTilePointerDown(event: PointerEvent<HTMLButtonElement>, cell: Cell) {
    if (event.pointerType === "mouse") {
      return;
    }

    event.preventDefault();
    handleCellClick(cell);
  }

  function handleCellClick(cell: Cell) {
    const tileId = board[cell.row][cell.col];

    if (!tileId || isComplete || clearingCells || deadlockModalOpen) {
      return;
    }

    if (selectedCell && selectedCell.row === cell.row && selectedCell.col === cell.col) {
      setSelectedCell(null);
      return;
    }

    if (!selectedCell) {
      setSelectedCell(cell);
      setHintCells(null);
      setConnectPath(null);
      return;
    }

    const selectedTileId = board[selectedCell.row][selectedCell.col];

    if (!selectedTileId) {
      setSelectedCell(cell);
      return;
    }

    if (selectedTileId !== tileId) {
      setSelectedCell(cell);
      setHintCells(null);
      setConnectPath(null);
      setCombo(0);
      setBanner({ text: "换一个相同图案试试", tone: "warn" });
      return;
    }

    const matchedPath = searchConnectPath(board, selectedCell, cell);

    if (!matchedPath) {
      setSelectedCell(cell);
      setConnectPath(null);
      setCombo(0);
      setBanner({ text: "这条路还不通", tone: "warn" });
      return;
    }

    const removedBoard = removePair(board, selectedCell, cell);
    const nextBoard = applyShiftAfterRemove(removedBoard, [selectedCell, cell], difficulty.shiftMode);
    const finalMoves = moves + 1;
    const nextCombo = nextComboAfterMatch(combo);
    const nextMaxCombo = Math.max(maxCombo, nextCombo);
    setMoves((current) => current + 1);
    setCombo(nextCombo);
    setMaxCombo(nextMaxCombo);
    setClearingCells([selectedCell, cell]);
    setConnectPath(matchedPath);
    setHintCells(null);
    setBanner({ text: nextCombo >= 2 ? `${nextCombo}连击` : "消掉一对", tone: "good" });
    showPraisePop();
    setSelectedCell(null);
    if (soundEffectsEnabled) {
      void playMatchSound();
    }

    clearTimerRef.current = window.setTimeout(() => {
      const hasNoMatch = countRemainingTiles(nextBoard) > 0 && !findAnyMatch(nextBoard);
      const shouldAskForRefresh = difficulty.level >= 5 && hasNoMatch;
      const playableBoard = difficulty.level >= 5 ? nextBoard : ensurePlayableBoard(nextBoard);
      const wasDeadlocked = difficulty.level < 5 && playableBoard !== nextBoard;

      setBoard(playableBoard);
      setClearingCells(null);
      setConnectPath(null);

      if (countRemainingTiles(playableBoard) === 0) {
        setCompletionRating(
          calculateCompletionRating({
            level: difficulty.level,
            seconds,
            moves: finalMoves,
            hintsUsed,
            maxCombo: nextMaxCombo,
            challenge: playMode === "challenge",
          }),
        );
        void recordCompletion(seconds, finalMoves);
        setCompletionModalOpen(true);
        setBanner({ text: "通关了，查看排行榜", tone: "good" });
        void setBackgroundMusicQuiet(false);
      } else if (shouldAskForRefresh) {
        setDeadlockModalOpen(true);
        setBanner({ text: "当前无可消除块，请点击刷新", tone: "warn" });
      } else if (wasDeadlocked) {
        setBanner({ text: "无路可走，已自动洗牌", tone: "neutral" });
      }
    }, 160);
  }

  function handleHint() {
    if (isComplete || clearingCells) {
      return;
    }

    if (hintsRemaining <= 0) {
      setBanner({ text: "提示已用完", tone: "warn" });
      return;
    }

    const pair = findAnyMatch(board);

    if (!pair) {
      if (difficulty.level >= 5) {
        setDeadlockModalOpen(true);
      }
      setBanner({ text: "暂时没有可连的对", tone: "warn" });
      return;
    }

    const nextHintsRemaining = hintsRemaining - 1;
    setHintCells([pair.start, pair.end]);
    setHintsRemaining(nextHintsRemaining);
    setHintsUsed((current) => current + 1);
    setCombo(0);
    setBanner({ text: nextHintsRemaining === 0 ? "提示已用完" : "提示已显示", tone: "neutral" });

    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current);
    }

    hintTimerRef.current = window.setTimeout(() => {
      setHintCells(null);
    }, 1400);
  }

  function handleShuffle() {
    if (isComplete || clearingCells) {
      return;
    }

    if (clearTimerRef.current) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    setBoard((currentBoard) => {
      const nextBoard =
        difficulty.level >= 5 ? shuffleBoardForShiftMode(currentBoard, difficulty.shiftMode) : shuffleBoard(currentBoard);

      if (difficulty.level >= 5 && countAvailableMatches(nextBoard) === 0) {
        setDeadlockModalOpen(true);
        setBanner({ text: "当前无可消除块，请点击刷新", tone: "warn" });
        return currentBoard;
      }

      setDeadlockModalOpen(false);
      return nextBoard;
    });
    setSelectedCell(null);
    setHintCells(null);
    setConnectPath(null);
    setCombo(0);
    setBanner({ text: difficulty.level >= 5 ? "已按当前进度刷新" : "已重新整理", tone: "neutral" });
  }

  const statusToneClass = banner.tone === "good" ? "is-good" : banner.tone === "warn" ? "is-warn" : "";
  const boardRows = board.length;
  const boardCols = board[0]?.length ?? 1;
  const activeLeaderboard = leaderboards[difficulty.id];
  const settingsDialog = (
    <SettingsDialog
      open={settingsOpen}
      backgroundMusicEnabled={backgroundMusicEnabled}
      soundEffectsEnabled={soundEffectsEnabled}
      onClose={() => setSettingsOpen(false)}
      onToggleBackgroundMusic={() => setBackgroundMusicEnabled((current) => !current)}
      onToggleSoundEffects={() => setSoundEffectsEnabled((current) => !current)}
    />
  );

  if (phase === "loading") {
    return (
      <>
        <LoadingScreen
          loadingComplete={loadingComplete}
          onStart={handleLoadingStart}
          onSettings={() => setSettingsOpen(true)}
        />
        {settingsDialog}
      </>
    );
  }

  if (phase === "nickname") {
    return (
      <>
        <main className="app-shell setup-shell nickname-shell">
          <section className="setup-panel" aria-label="玩家信息">
            <div className="title-block">
              <p className="eyebrow">果趣对对消</p>
              <h1>输入昵称</h1>
            </div>

            <label className="name-field">
              <span>昵称</span>
              <input
                aria-label="昵称"
                maxLength={12}
                value={nicknameInput}
                onChange={(event) => {
                  setNicknameInput(event.target.value);
                  setSetupError("");
                }}
              />
            </label>

            {setupError ? (
              <p className="setup-error" role="alert">
                {setupError}
              </p>
            ) : null}

            <button className="start-button" type="button" onClick={handleNicknameSubmit}>
              确认昵称
            </button>
          </section>
        </main>
        {settingsDialog}
      </>
    );
  }

  if (phase === "map") {
    return (
      <>
        <LevelMap
          playerName={playerName}
          levels={levelList}
          onStartLevel={(level) => void handleStartGame(level)}
          onChallenge={handleChallengeStart}
          onSettings={() => setSettingsOpen(true)}
        />
        {settingsDialog}
      </>
    );
  }

  return (
    <>
    <main className="app-shell">
      <header className="topbar">
        <div className="title-block">
          <p className="eyebrow">果趣对对消 · {difficulty.subtitle}</p>
          <h1>{difficulty.label}</h1>
          {playMode === "challenge" ? <span className="mode-pill">挑战模式</span> : null}
        </div>

        <button className="settings-button in-game corner-left" type="button" aria-label="设置" onClick={() => setSettingsOpen(true)}>
          <Settings aria-hidden="true" size={20} />
        </button>

        <div className="status-strip" aria-label="游戏统计">
          <div className="stat-chip">
            <span>时间</span>
            <strong>{formatTime(seconds)}</strong>
          </div>
          <div className="stat-chip">
            <span>步数</span>
            <strong>{moves}</strong>
          </div>
          <div className="stat-chip">
            <span>剩余</span>
            <strong>{remainingPairs} 对</strong>
          </div>
          <div className="stat-chip">
            <span>连击</span>
            <strong>{combo}</strong>
          </div>
        </div>

        <div className="level-progress" aria-label="关卡进度">
          {levelList.map((item) => (
            <span key={`${item.level}-${item.subtitle}`} className={item.level <= difficulty.level ? "is-unlocked" : ""}>
              {item.level}
            </span>
          ))}
        </div>
      </header>

      <section className="play-area">
        <div className="board-shell">
          <div
            className="board-grid"
            role="grid"
            aria-label="果趣对对消棋盘"
            style={
              {
                "--board-cols": boardCols,
                "--board-rows": boardRows,
              } as CSSProperties
            }
          >
            {connectPath ? (
              <svg className="connect-line" data-testid="connect-line" viewBox={`0 0 ${boardCols} ${boardRows}`} aria-hidden="true">
                <path d={connectPathToSvgPath(connectPath)} />
              </svg>
            ) : null}
            {praisePop ? (
              <div
                key={praisePop.id}
                className={`praise-pop praise-pop-${praisePop.variant}`}
                data-testid="praise-pop"
                aria-live="polite"
              >
                {praisePop.text}
              </div>
            ) : null}
            {board.map((row, rowIndex) =>
              row.map((tileId, colIndex) => {
                const cell = { row: rowIndex, col: colIndex };
                const tile = tileId ? tileById.get(tileId) : null;
                const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                const isHinted = hintCells?.some((hint) => hint.row === rowIndex && hint.col === colIndex) ?? false;
                const isClearing = clearingCells?.some((hint) => hint.row === rowIndex && hint.col === colIndex) ?? false;

                return (
                  <button
                    key={cellKey(cell)}
                    aria-label={tile ? `${tile.label}` : "空格"}
                    aria-pressed={isSelected}
                    className={[
                      "tile",
                      isSelected ? "is-selected" : "",
                      isHinted ? "is-hint" : "",
                      isClearing ? "is-clearing" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      tile
                        ? ({
                            "--tile-color": getTileColor(tileId as string),
                          } as CSSProperties)
                        : undefined
                    }
                    disabled={!tile || Boolean(clearingCells) || isComplete}
                    type="button"
                    onPointerDown={(event) => handleTilePointerDown(event, cell)}
                    onClick={() => handleCellClick(cell)}
                  >
                    {tile ? <span aria-hidden="true">{tile.icon}</span> : null}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        <aside className="control-rail">
          <p className={`banner ${statusToneClass}`} role="status" aria-live="polite">
            {banner.text}
          </p>

          <div className="player-card">
            <span>玩家</span>
            <strong>{playerName}</strong>
          </div>
          {playMode === "challenge" ? (
            <div className="player-card challenge-goal">
              <span>目标三星</span>
              <strong>少提示 · 高连击</strong>
            </div>
          ) : null}

          <div className="controls">
            <button
              className="control-button"
              type="button"
              onClick={handleHint}
              disabled={Boolean(clearingCells) || isComplete || hintsRemaining <= 0}
            >
              <Lightbulb aria-hidden="true" size={18} />
              <span className="capybara-icon" aria-hidden="true">🦫</span>
              提示 {hintsRemaining}
            </button>
            <button className="control-button" type="button" onClick={handleShuffle} disabled={Boolean(clearingCells) || isComplete}>
              <Shuffle aria-hidden="true" size={18} />
              <span className="capybara-icon" aria-hidden="true">🦫</span>
              刷新
            </button>
            <button className="control-button" type="button" onClick={() => resetRound()}>
              <RotateCcw aria-hidden="true" size={18} />
              重开
            </button>
            <button className="control-button secondary" type="button" onClick={() => resetRound()}>
              <TimerReset aria-hidden="true" size={18} />
              新一局
            </button>
            <button className="control-button feedback-button" type="button" onClick={() => openFeedbackDialog()}>
              <MessageSquareText aria-hidden="true" size={18} />
              意见栏
            </button>
          </div>

        </aside>
      </section>
    </main>
    <CompletionDialog
      open={completionModalOpen}
      entries={activeLeaderboard}
      title={`${difficulty.label}排行榜`}
      status={leaderboardStatus}
      isFinalLevel={levelIndex >= levelList.length - 1}
      rating={completionRating}
      maxCombo={maxCombo}
      hintsUsed={hintsUsed}
      playMode={playMode}
      onClose={handleNextLevel}
    />
    <DeadlockDialog open={deadlockModalOpen} onRefresh={handleShuffle} />
    <ShiftRuleDialog level={shiftRuleLevel} onClose={() => setShiftRuleLevel(null)} />
    <FeedbackDialog
      open={feedbackOpen}
      text={feedbackText}
      message={feedbackMessage}
      onTextChange={setFeedbackText}
      onSubmit={handleFeedbackSubmit}
      onClose={closeFeedbackDialog}
    />
    {settingsDialog}
    </>
  );
}

function LevelMap({
  playerName,
  levels,
  onStartLevel,
  onChallenge,
  onSettings,
}: {
  playerName: string;
  levels: LevelConfig[];
  onStartLevel: (level: LevelConfig) => void;
  onChallenge: () => void;
  onSettings: () => void;
}) {
  return (
    <main className="app-shell level-map-shell">
      <button className="settings-button loading-settings" type="button" aria-label="设置" onClick={onSettings}>
        <Settings aria-hidden="true" size={22} />
      </button>
      <section className="level-map-hero">
        <p className="eyebrow">玩家：{playerName}</p>
        <h1>关卡地图</h1>
        <p>选择普通关卡慢慢推进，或者直接进入挑战模式冲三星。</p>
      </section>
      <section className="challenge-card" aria-label="挑战模式">
        <div>
          <span>限时目标</span>
          <strong>挑战模式</strong>
          <p>从移动关卡开始，目标三星，少提示、高连击会拿到更高评价。</p>
        </div>
        <button className="start-button" type="button" onClick={onChallenge}>
          挑战模式
        </button>
      </section>
      <section className="level-map-grid" aria-label="关卡列表">
        {levels.map((level) => (
          <button
            key={`${level.level}-${level.subtitle}`}
            className="level-node"
            type="button"
            aria-label={`开始第${level.level}关`}
            onClick={() => onStartLevel(level)}
          >
            <span>第{level.level}关</span>
            <strong>{level.subtitle}</strong>
            <em>开始第{level.level}关</em>
          </button>
        ))}
      </section>
    </main>
  );
}

function LoadingScreen({
  loadingComplete,
  onStart,
  onSettings,
}: {
  loadingComplete: boolean;
  onStart: () => void;
  onSettings: () => void;
}) {
  return (
    <main className="loading-screen" aria-label="果趣对对消加载中">
      <button className="settings-button loading-settings" type="button" aria-label="设置" onClick={onSettings}>
        <Settings aria-hidden="true" size={22} />
      </button>
      <div className="loading-cloud cloud-one" />
      <div className="loading-cloud cloud-two" />
      <div className="fruit-logo" aria-hidden="true">
        <span className="fruit fruit-a">🍉</span>
        <span className="fruit fruit-b">🫐</span>
        <span className="fruit fruit-c">🍊</span>
        <strong>
          <span>果趣</span>
          <span>对对消</span>
        </strong>
      </div>
      <div className="loading-field" aria-hidden="true">
        <span className="flower flower-a">✿</span>
        <span className="flower flower-b">✿</span>
        <span className="flower flower-c">✿</span>
      </div>
      {loadingComplete ? (
        <button className="loading-start-button" type="button" onClick={onStart}>
          开始游戏
        </button>
      ) : null}
      <div className="loading-bar" role="progressbar" aria-label="加载进度">
        <span />
      </div>
      <div className="healthy-notice" aria-label="健康游戏忠告">
        <strong>健康游戏忠告</strong>
        <p>抵制不良游戏　拒绝盗版游戏　注意自我保护　谨防受骗上当</p>
        <p>适度游戏益脑　沉迷游戏伤身　合理安排时间　享受健康生活</p>
      </div>
    </main>
  );
}

function SettingsDialog({
  open,
  backgroundMusicEnabled,
  soundEffectsEnabled,
  onClose,
  onToggleBackgroundMusic,
  onToggleSoundEffects,
}: {
  open: boolean;
  backgroundMusicEnabled: boolean;
  soundEffectsEnabled: boolean;
  onClose: () => void;
  onToggleBackgroundMusic: () => void;
  onToggleSoundEffects: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="设置">
      <section className="settings-panel">
        <div className="settings-title">
          <h2>设置</h2>
          <button className="settings-close" type="button" aria-label="关闭设置" onClick={onClose}>
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <button className="setting-row" type="button" role="switch" aria-checked={backgroundMusicEnabled} onClick={onToggleBackgroundMusic}>
          <span>背景音乐</span>
          <strong>{backgroundMusicEnabled ? "开" : "关"}</strong>
        </button>
        <button className="setting-row" type="button" role="switch" aria-checked={soundEffectsEnabled} onClick={onToggleSoundEffects}>
          <span>按键音效</span>
          <strong>{soundEffectsEnabled ? "开" : "关"}</strong>
        </button>
      </section>
    </div>
  );
}

function FeedbackDialog({
  open,
  text,
  message,
  onTextChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  text: string;
  message: string;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="意见栏">
      <section className="feedback-panel">
        <div className="settings-title">
          <h2>意见栏</h2>
          <button className="settings-close" type="button" aria-label="关闭意见栏" onClick={onClose}>
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <p>请给游戏提点意见，或者写下需要改进的地方。</p>
        <textarea
          aria-label="意见内容"
          maxLength={200}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="比如关卡难度、图案大小、音效、排行榜等..."
        />
        {message ? (
          <p className="feedback-message" role="status">
            {message}
          </p>
        ) : null}
        <div className="feedback-actions">
          <button className="start-button" type="button" onClick={onSubmit}>
            提交意见
          </button>
          <button className="control-button secondary" type="button" onClick={onClose}>
            稍后再说
          </button>
        </div>
      </section>
    </div>
  );
}

function CompletionDialog({
  open,
  entries,
  title,
  status,
  isFinalLevel,
  rating,
  maxCombo,
  hintsUsed,
  playMode,
  onClose,
}: {
  open: boolean;
  entries: LeaderboardEntry[];
  title: string;
  status: LeaderboardStatus;
  isFinalLevel: boolean;
  rating: CompletionRating | null;
  maxCombo: number;
  hintsUsed: number;
  playMode: PlayMode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="通关排行榜">
      <section className="completion-panel">
        <div className="completion-hero" aria-hidden="true">
          🍉 🏆 🍍
        </div>
        {rating ? (
          <section className="completion-rating" aria-label="通关评价">
            <h2>{getCompletionTitle(rating.stars)}</h2>
            <div className="star-row" aria-label={`${rating.stars}星`}>
              {Array.from({ length: 3 }, (_, index) => (
                <span key={index} className={index < rating.stars ? "is-lit" : ""}>
                  ★
                </span>
              ))}
            </div>
            <p>
              最高连击 {maxCombo} · 使用提示 {hintsUsed} 次
            </p>
          </section>
        ) : null}
        <LeaderboardPanel entries={entries} title={title} status={status} />
        <button className="start-button" type="button" onClick={onClose}>
          {playMode === "challenge" ? "返回地图" : isFinalLevel ? "再玩一局" : "进入下一关"}
        </button>
      </section>
    </div>
  );
}

function DeadlockDialog({ open, onRefresh }: { open: boolean; onRefresh: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="当前无可消除块">
      <section className="deadlock-panel">
        <div className="deadlock-icon" aria-hidden="true">
          🔄
        </div>
        <h2>当前无可消除块</h2>
        <p>请点击刷新，系统会保留当前已消除进度，只重排剩余块。</p>
        <button className="start-button" type="button" onClick={onRefresh}>
          刷新
        </button>
      </section>
    </div>
  );
}

function ShiftRuleDialog({ level, onClose }: { level: LevelConfig | null; onClose: () => void }) {
  if (!level) {
    return null;
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="关卡规则提示">
      <section className="shift-rule-panel">
        <div className="shift-rule-icon" aria-hidden="true">
          🍉
        </div>
        <h2>{level.label}规则</h2>
        <p>{getShiftInstructionText(level.shiftMode)}</p>
        <button className="start-button" type="button" onClick={onClose}>
          知道了
        </button>
      </section>
    </div>
  );
}

function getLeaderboardStatusText(status: LeaderboardStatus): string {
  if (status === "online") {
    return "在线";
  }

  if (status === "loading") {
    return "同步中";
  }

  if (status === "error") {
    return "本地备用";
  }

  return "本地";
}

function LeaderboardPanel({
  entries,
  title,
  status,
}: {
  entries: LeaderboardEntry[];
  title: string;
  status: LeaderboardStatus;
}) {
  return (
    <section className="leaderboard" aria-label={title}>
      <div className="leaderboard-title">
        <h2>{title}</h2>
        <span>{getLeaderboardStatusText(status)}</span>
      </div>
      {entries.length === 0 ? (
        <p className="empty-rank">暂无排行</p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={`${entry.nickname}-${entry.completedAt}`}>
              <span>{entry.nickname}</span>
              <strong>{formatTime(entry.seconds)}</strong>
              <em>{entry.moves}步</em>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
