function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const restSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

function buildLeaderboardRows(entries, maxRows = 5) {
  if (!Array.isArray(entries) || maxRows <= 0) {
    return [];
  }

  return entries.slice(0, maxRows).map((entry, index) => ({
    rank: index + 1,
    nickname: String(entry.nickname || "").trim(),
    time: formatTime(Number(entry.seconds) || 0),
    moves: `${Number(entry.moves) || 0}步`,
  }));
}

module.exports = {
  buildLeaderboardRows,
  formatTime,
};
