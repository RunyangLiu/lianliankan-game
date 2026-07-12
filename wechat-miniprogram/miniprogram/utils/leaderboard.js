const config = {
  url: "https://elvhilpbpndlwoeusyxt.supabase.co",
  anonKey: "sb_publishable_chldC7aD5kZ1TQZxUSNE_g_ljefum4x",
};

const scoresTable = "lianliankan_scores";
const leaderboardStorageKey = "lianliankan-leaderboards-v1";
const nicknameStorageKey = "guoquduiduixiao-player-nickname-v1";
const resetStorageKey = "guoquduiduixiao-user-data-reset-v1";
const blockedNicknameFragments = ["xijinping", "jinping", "xjp"];

function createEmptyLeaderboards() {
  return {
    easy: [],
    normal: [],
    hard: [],
  };
}

function normalizeNickname(nickname) {
  return nickname.trim().toLocaleLowerCase();
}

function validateNickname(nickname) {
  const trimmed = String(nickname || "").trim();

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

function clearStoredUserData() {
  try {
    wx.removeStorageSync(leaderboardStorageKey);
    wx.removeStorageSync(nicknameStorageKey);
    wx.setStorageSync(resetStorageKey, "true");
  } catch (error) {
    // 清理失败不影响进入游戏。
  }
}

function ensureStoredUserDataReset() {
  try {
    if (wx.getStorageSync(resetStorageKey) !== "true") {
      clearStoredUserData();
    }
  } catch (error) {
    // 存储不可用时忽略。
  }
}

function isNicknameTaken(leaderboards, difficultyId, nickname) {
  const normalized = normalizeNickname(nickname);
  return leaderboards[difficultyId].some((entry) => normalizeNickname(entry.nickname) === normalized);
}

function addLeaderboardEntry(leaderboards, difficultyId, entry) {
  const seenNames = new Set();
  const nextEntries = leaderboards[difficultyId]
    .concat(entry)
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

  return Object.assign({}, leaderboards, {
    [difficultyId]: nextEntries,
  });
}

function request({ url, method = "GET", data }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      header: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }

        reject(new Error(`Supabase request failed: ${response.statusCode}`));
      },
      fail: reject,
    });
  });
}

function getTableUrl(query = "") {
  return `${config.url}/rest/v1/${scoresTable}${query}`;
}

function rowToEntry(row) {
  return {
    nickname: row.nickname,
    seconds: row.seconds,
    moves: row.moves,
    completedAt: row.completed_at,
  };
}

function isBetterScore(entry, current) {
  return entry.seconds < current.seconds || (entry.seconds === current.seconds && entry.moves < current.moves);
}

async function fetchOnlineLeaderboards() {
  const query = "?select=difficulty,nickname,seconds,moves,completed_at&order=difficulty.asc&order=seconds.asc&order=moves.asc";
  const rows = await request({ url: getTableUrl(query) });

  return rows.reduce((leaderboards, row) => {
    return addLeaderboardEntry(leaderboards, row.difficulty, rowToEntry(row));
  }, createEmptyLeaderboards());
}

async function submitOnlineLeaderboardEntry(difficultyId, entry) {
  const nicknameKey = normalizeNickname(entry.nickname);
  const filter = `difficulty=eq.${encodeURIComponent(difficultyId)}&nickname_key=eq.${encodeURIComponent(nicknameKey)}`;
  const existingRows = await request({
    url: getTableUrl(`?select=seconds,moves&${filter}&limit=1`),
  });
  const existing = existingRows[0];

  if (!existing) {
    await request({
      url: getTableUrl(),
      method: "POST",
      data: {
        difficulty: difficultyId,
        nickname: entry.nickname,
        nickname_key: nicknameKey,
        seconds: entry.seconds,
        moves: entry.moves,
        completed_at: entry.completedAt,
      },
    });
    return fetchOnlineLeaderboards();
  }

  if (isBetterScore(entry, existing)) {
    await request({
      url: getTableUrl(`?${filter}`),
      method: "PATCH",
      data: {
        nickname: entry.nickname,
        seconds: entry.seconds,
        moves: entry.moves,
        completed_at: entry.completedAt,
      },
    });
  }

  return fetchOnlineLeaderboards();
}

module.exports = {
  clearStoredUserData,
  createEmptyLeaderboards,
  fetchOnlineLeaderboards,
  isNicknameTaken,
  normalizeNickname,
  validateNickname,
  submitOnlineLeaderboardEntry,
};
