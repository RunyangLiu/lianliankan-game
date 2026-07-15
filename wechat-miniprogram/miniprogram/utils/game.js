const difficultyLevels = {
  easy: { id: "easy", label: "简单", rows: 6, cols: 6, symbolCount: 12 },
  normal: { id: "normal", label: "一般", rows: 8, cols: 8, symbolCount: 32 },
  hard: { id: "hard", label: "困难", rows: 8, cols: 10, symbolCount: 32 },
};

const difficultyList = [difficultyLevels.easy, difficultyLevels.normal, difficultyLevels.hard];

const levelList = [
  { id: "easy", label: "第1关", level: 1, subtitle: "4 x 5 夏日开场", rows: 4, cols: 5, symbolCount: 10, shiftMode: "none" },
  { id: "normal", label: "第2关", level: 2, subtitle: "6 x 7 缤纷果园", rows: 6, cols: 7, symbolCount: 21, shiftMode: "none" },
  { id: "normal", label: "第3关", level: 3, subtitle: "7 x 8 清凉海风", rows: 7, cols: 8, symbolCount: 28, shiftMode: "none" },
  { id: "hard", label: "第4关", level: 4, subtitle: "8 x 9 水果派对", rows: 8, cols: 9, symbolCount: 32, shiftMode: "none" },
  { id: "hard", label: "第5关", level: 5, subtitle: "13 x 8 同行向左移动", rows: 13, cols: 8, symbolCount: 32, shiftMode: "row-left" },
  { id: "hard", label: "第6关", level: 6, subtitle: "13 x 8 同行向右移动", rows: 13, cols: 8, symbolCount: 32, shiftMode: "row-right" },
  { id: "hard", label: "第7关", level: 7, subtitle: "13 x 8 同列向上移动", rows: 13, cols: 8, symbolCount: 32, shiftMode: "col-up" },
  { id: "hard", label: "第8关", level: 8, subtitle: "13 x 8 同行向右移动", rows: 13, cols: 8, symbolCount: 32, shiftMode: "row-right" },
];

function getShiftInstructionText(mode) {
  if (mode === "row-left") {
    return "消除后会向左移动";
  }

  if (mode === "row-right") {
    return "消除后会向右移动";
  }

  if (mode === "col-up") {
    return "消除后会向上移动";
  }

  if (mode === "col-down") {
    return "消除后会向下移动";
  }

  return "";
}

const tileDeck = [
  { id: "strawberry", emoji: "🍓", label: "草莓" },
  { id: "orange", emoji: "🍊", label: "橙子" },
  { id: "lemon", emoji: "🍋", label: "柠檬" },
  { id: "watermelon", emoji: "🍉", label: "西瓜" },
  { id: "grape", emoji: "🍇", label: "葡萄" },
  { id: "peach", emoji: "🍑", label: "桃子" },
  { id: "kiwi", emoji: "🥝", label: "猕猴桃" },
  { id: "pineapple", emoji: "🍍", label: "菠萝" },
  { id: "cherry", emoji: "🍒", label: "樱桃" },
  { id: "coconut", emoji: "🥥", label: "椰子" },
  { id: "apple", emoji: "🍎", label: "苹果" },
  { id: "pear", emoji: "🍐", label: "梨" },
  { id: "banana", emoji: "🍌", label: "香蕉" },
  { id: "blueberry", emoji: "🫐", label: "蓝莓" },
  { id: "green-apple", emoji: "🍏", label: "青苹果" },
  { id: "mushroom", emoji: "🍄", label: "蘑菇" },
  { id: "corn", emoji: "🌽", label: "玉米" },
  { id: "carrot", emoji: "🥕", label: "胡萝卜" },
  { id: "cake", emoji: "🍰", label: "蛋糕" },
  { id: "donut", emoji: "🍩", label: "甜甜圈" },
  { id: "cookie", emoji: "🍪", label: "饼干" },
  { id: "cupcake", emoji: "🧁", label: "纸杯蛋糕" },
  { id: "popcorn", emoji: "🍿", label: "爆米花" },
  { id: "burger", emoji: "🍔", label: "汉堡" },
  { id: "pizza", emoji: "🍕", label: "披萨" },
  { id: "sushi", emoji: "🍣", label: "寿司" },
  { id: "shrimp", emoji: "🍤", label: "炸虾" },
  { id: "dice", emoji: "🎲", label: "骰子" },
  { id: "gamepad", emoji: "🎮", label: "游戏机" },
  { id: "guitar", emoji: "🎸", label: "吉他" },
  { id: "plane", emoji: "✈️", label: "飞机" },
  { id: "bike", emoji: "🚲", label: "自行车" },
];

const directions = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

function shuffle(values) {
  const copy = values.slice();

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const value = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = value;
  }

  return copy;
}

function placeValuesInRows(values, rows, cols) {
  const board = createEmptyBoard(rows, cols);
  let cursor = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const symbolId = values[cursor];

      if (symbolId === undefined) {
        return board;
      }

      board[row][col] = symbolId;
      cursor += 1;
    }
  }

  return board;
}

function buildDifficultyTiles(difficulty) {
  const pairCount = (difficulty.rows * difficulty.cols) / 2;
  const symbolIds = tileDeck.slice(0, difficulty.symbolCount).map((tile) => tile.id);
  const pairIds = Array.from({ length: pairCount }, (_, index) => symbolIds[index % symbolIds.length]);
  return pairIds.flatMap((symbolId) => [symbolId, symbolId]);
}

function placeTilesAsRemovablePairs(tiles, rows, cols) {
  const remaining = tiles.slice();
  const pairIds = [];

  while (remaining.length > 0) {
    const tile = remaining.shift();
    const pairIndex = remaining.indexOf(tile);

    if (pairIndex !== -1) {
      remaining.splice(pairIndex, 1);
      pairIds.push(tile);
    }
  }

  const pairedTiles = shuffle(pairIds).flatMap((tile) => [tile, tile]);
  return placeValuesInRows(pairedTiles.concat(Array(rows * cols - pairedTiles.length).fill(null)), rows, cols);
}

function createSolvableBoardFromTiles(tiles, rows, cols) {
  const values = tiles.concat(Array(rows * cols - tiles.length).fill(null));

  for (let attempt = 0; attempt < 300; attempt += 1) {
    const board = placeValuesInRows(shuffle(values), rows, cols);

    if (canFullyClearBoard(board)) {
      return board;
    }
  }

  return placeTilesAsRemovablePairs(tiles, rows, cols);
}

function hasShiftMode(difficulty) {
  return difficulty && difficulty.shiftMode && difficulty.shiftMode !== "none";
}

function countPairsClearableWithShift(board, mode) {
  let nextBoard = board.map((row) => row.slice());
  let clearedPairs = 0;

  while (countRemainingTiles(nextBoard) > 0) {
    const pair = findAnyMatch(nextBoard);

    if (!pair) {
      return clearedPairs;
    }

    nextBoard = applyShiftAfterRemove(removePair(nextBoard, pair.start, pair.end), [pair.start, pair.end], mode);
    clearedPairs += 1;
  }

  return clearedPairs;
}

function pickShiftBoardBand() {
  const roll = Math.random();

  if (roll < 0.6) {
    return { minRatio: 0.5, maxRatio: 0.62, targetRatio: 0.56 };
  }

  if (roll < 0.9) {
    return { minRatio: 0.68, maxRatio: 0.82, targetRatio: 0.74 };
  }

  return { minRatio: 1, maxRatio: 1, targetRatio: 1 };
}

function countAdjacentSameTiles(board) {
  let count = 0;

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const tile = board[row][col];

      if (!tile) {
        continue;
      }

      if (board[row][col + 1] === tile) {
        count += 1;
      }

      if (board[row + 1] && board[row + 1][col] === tile) {
        count += 1;
      }
    }
  }

  return count;
}

function createShiftReadyBoardFromTiles(tiles, difficulty) {
  const totalPairs = tiles.length / 2;
  const band = pickShiftBoardBand();
  const maxAdjacentPairs = Math.max(10, Math.floor(totalPairs * 0.31));
  let bestBoard = placeValuesInRows(shuffle(tiles), difficulty.rows, difficulty.cols);
  let bestScore = Number.POSITIVE_INFINITY;
  const attemptLimit = band.targetRatio === 1 ? 900 : 700;

  for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
    const board = placeValuesInRows(shuffle(tiles), difficulty.rows, difficulty.cols);
    const clearedPairs = countPairsClearableWithShift(board, difficulty.shiftMode);
    const ratio = clearedPairs / totalPairs;
    const adjacentPairs = countAdjacentSameTiles(board);
    const fitsAdjacentLimit = band.targetRatio === 1 || adjacentPairs <= maxAdjacentPairs;

    if (ratio >= band.minRatio && ratio <= band.maxRatio && fitsAdjacentLimit) {
      return board;
    }

    const ratioScore = Math.abs(ratio - band.targetRatio);
    const adjacentPenalty = adjacentPairs > maxAdjacentPairs ? (adjacentPairs - maxAdjacentPairs) / totalPairs : 0;
    const score = ratioScore + adjacentPenalty;

    if (score < bestScore) {
      bestBoard = board;
      bestScore = score;
    }
  }

  if (band.targetRatio === 1) {
    return placeTilesAsRemovablePairs(shuffle(tiles), difficulty.rows, difficulty.cols);
  }

  return bestBoard;
}

function isInsideBoard(board, row, col) {
  return row >= 0 && row < board.length && col >= 0 && col < board[0].length;
}

function isInsideExtendedBoard(board, row, col) {
  return row >= -1 && row <= board.length && col >= -1 && col <= board[0].length;
}

function canVisitCell(board, row, col, start, end) {
  if (!isInsideExtendedBoard(board, row, col)) {
    return false;
  }

  if (!isInsideBoard(board, row, col)) {
    return true;
  }

  if (row === start.row && col === start.col) {
    return true;
  }

  if (row === end.row && col === end.col) {
    return true;
  }

  return board[row][col] === null;
}

function stateKey(state) {
  return `${state.row}:${state.col}:${state.direction}`;
}

function searchConnectPath(board, start, end) {
  if (start.row === end.row && start.col === end.col) {
    return null;
  }

  if (!isInsideBoard(board, start.row, start.col) || !isInsideBoard(board, end.row, end.col)) {
    return null;
  }

  const startId = board[start.row][start.col];
  const endId = board[end.row][end.col];

  if (!startId || !endId || startId !== endId) {
    return null;
  }

  const queue = [{ row: start.row, col: start.col, direction: -1, turns: 0 }];
  const visited = new Map();
  const previous = new Map();
  const stateLookup = new Map();
  const startKey = stateKey(queue[0]);

  visited.set(startKey, 0);
  previous.set(startKey, null);
  stateLookup.set(startKey, queue[0]);

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = stateKey(current);

    if (current.row === end.row && current.col === end.col) {
      const path = [];
      let key = currentKey;

      while (key) {
        const state = stateLookup.get(key);

        if (!state) {
          break;
        }

        path.push({ row: state.row, col: state.col });
        key = previous.get(key) || null;
      }

      return path.reverse();
    }

    directions.forEach((delta, direction) => {
      const nextRow = current.row + delta.row;
      const nextCol = current.col + delta.col;

      if (!canVisitCell(board, nextRow, nextCol, start, end)) {
        return;
      }

      const nextTurns = current.direction === -1 || current.direction === direction ? current.turns : current.turns + 1;

      if (nextTurns > 2) {
        return;
      }

      const nextState = { row: nextRow, col: nextCol, direction, turns: nextTurns };
      const nextKey = stateKey(nextState);
      const seenTurns = visited.get(nextKey);

      if (seenTurns !== undefined && seenTurns <= nextTurns) {
        return;
      }

      visited.set(nextKey, nextTurns);
      previous.set(nextKey, currentKey);
      stateLookup.set(nextKey, nextState);
      queue.push(nextState);
    });
  }

  return null;
}

function createBoard(difficulty) {
  const targetDifficulty = difficulty || difficultyLevels.normal;

  if (hasShiftMode(targetDifficulty)) {
    return createShiftReadyBoardFromTiles(buildDifficultyTiles(targetDifficulty), targetDifficulty);
  }

  return createSolvableBoardFromTiles(buildDifficultyTiles(targetDifficulty), targetDifficulty.rows, targetDifficulty.cols);
}

function shuffleBoard(board) {
  const remainingTiles = board.flat().filter((tile) => tile !== null);
  const rows = board.length;
  const cols = board[0] ? board[0].length : 0;
  return createSolvableBoardFromTiles(remainingTiles, rows, cols);
}

function countRemainingPairs(board) {
  return countRemainingTiles(board) / 2;
}

function countAvailableMatches(board) {
  let matches = 0;
  const positionsById = new Map();

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const tile = board[row][col];

      if (!tile) {
        continue;
      }

      const positions = positionsById.get(tile) || [];
      positions.push({ row, col });
      positionsById.set(tile, positions);
    }
  }

  for (const positions of positionsById.values()) {
    for (let index = 0; index < positions.length - 1; index += 1) {
      for (let compare = index + 1; compare < positions.length; compare += 1) {
        if (canConnect(board, positions[index], positions[compare])) {
          matches += 1;
        }
      }
    }
  }

  return matches;
}

function shuffleBoardPreservingLayout(board) {
  const occupiedCells = [];
  const remainingTiles = [];

  board.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      if (!tile) {
        return;
      }

      occupiedCells.push({ row: rowIndex, col: colIndex });
      remainingTiles.push(tile);
    });
  });

  if (remainingTiles.length === 0) {
    return board;
  }

  const minimumMatches = Math.min(4, countRemainingPairs(board));

  for (let attempt = 0; attempt < 600; attempt += 1) {
    const nextBoard = board.map((row) => row.map(() => null));
    const shuffledTiles = shuffle(remainingTiles);

    occupiedCells.forEach((cell, index) => {
      nextBoard[cell.row][cell.col] = shuffledTiles[index];
    });

    if (countAvailableMatches(nextBoard) >= minimumMatches) {
      return nextBoard;
    }
  }

  return board;
}

function compactRowLeft(row) {
  const values = row.filter((tile) => tile !== null);
  return values.concat(Array(row.length - values.length).fill(null));
}

function compactRowRight(row) {
  const values = row.filter((tile) => tile !== null);
  return Array(row.length - values.length).fill(null).concat(values);
}

function compactColumn(board, col, mode) {
  const nextBoard = board.map((row) => row.slice());
  const values = nextBoard.map((row) => row[col]).filter((tile) => tile !== null);
  const blanks = Array(nextBoard.length - values.length).fill(null);
  const nextValues = mode === "col-up" ? values.concat(blanks) : blanks.concat(values);

  nextValues.forEach((tile, row) => {
    nextBoard[row][col] = tile;
  });

  return nextBoard;
}

function normalizeLayoutForShiftMode(board, mode) {
  if (mode === "row-left") {
    return board.map((row) => compactRowLeft(row));
  }

  if (mode === "row-right") {
    return board.map((row) => compactRowRight(row));
  }

  if (mode === "col-up" || mode === "col-down") {
    let nextBoard = board.map((row) => row.slice());
    const colCount = nextBoard[0] ? nextBoard[0].length : 0;

    for (let col = 0; col < colCount; col += 1) {
      nextBoard = compactColumn(nextBoard, col, mode);
    }

    return nextBoard;
  }

  return board;
}

function shuffleBoardForShiftMode(board, mode) {
  return shuffleBoardPreservingLayout(normalizeLayoutForShiftMode(board, mode));
}

function ensurePlayableBoard(board) {
  if (countRemainingTiles(board) === 0 || canFullyClearBoard(board)) {
    return board;
  }

  return shuffleBoard(board);
}

function removePair(board, a, b) {
  const nextBoard = board.map((row) => row.slice());
  nextBoard[a.row][a.col] = null;
  nextBoard[b.row][b.col] = null;
  return nextBoard;
}

function applyShiftAfterRemove(board, cells, mode) {
  if (!mode || mode === "none") {
    return board;
  }

  let nextBoard = board.map((row) => row.slice());

  if (mode === "row-left" || mode === "row-right") {
    const affectedRows = Array.from(new Set(cells.map((cell) => cell.row)));
    affectedRows.forEach((row) => {
      nextBoard[row] = mode === "row-left" ? compactRowLeft(nextBoard[row]) : compactRowRight(nextBoard[row]);
    });
    return nextBoard;
  }

  const affectedCols = Array.from(new Set(cells.map((cell) => cell.col)));
  affectedCols.forEach((col) => {
    nextBoard = compactColumn(nextBoard, col, mode);
  });

  return nextBoard;
}

function countRemainingTiles(board) {
  return board.flat().filter((tile) => tile !== null).length;
}

function canConnect(board, start, end) {
  return searchConnectPath(board, start, end) !== null;
}

function canFullyClearBoard(board) {
  let nextBoard = board.map((row) => row.slice());

  while (countRemainingTiles(nextBoard) > 0) {
    const pair = findAnyMatch(nextBoard);

    if (!pair) {
      return false;
    }

    nextBoard = removePair(nextBoard, pair.start, pair.end);
  }

  return true;
}

function findAnyMatch(board) {
  const positionsById = new Map();

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const tile = board[row][col];

      if (!tile) {
        continue;
      }

      const positions = positionsById.get(tile) || [];
      positions.push({ row, col });
      positionsById.set(tile, positions);
    }
  }

  for (const positions of positionsById.values()) {
    if (positions.length < 2) {
      continue;
    }

    for (let index = 0; index < positions.length - 1; index += 1) {
      for (let compare = index + 1; compare < positions.length; compare += 1) {
        if (canConnect(board, positions[index], positions[compare])) {
          return { start: positions[index], end: positions[compare] };
        }
      }
    }
  }

  return null;
}

module.exports = {
  applyShiftAfterRemove,
  countAvailableMatches,
  countRemainingTiles,
  createBoard,
  difficultyLevels,
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
};
