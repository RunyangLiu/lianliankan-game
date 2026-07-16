export type Cell = {
  row: number;
  col: number;
};

export type Board = Array<Array<string | null>>;

export type TileInfo = {
  id: string;
  emoji: string;
  icon: string;
  label: string;
};

export type DifficultyId = "easy" | "normal" | "hard";

export type DifficultyConfig = {
  id: DifficultyId;
  label: string;
  rows: number;
  cols: number;
  symbolCount: number;
};

export type ShiftMode = "none" | "row-left" | "row-right" | "col-up" | "col-down";

export type LevelConfig = DifficultyConfig & {
  level: number;
  subtitle: string;
  shiftMode: ShiftMode;
};

export const boardRows = 8;
export const boardCols = 8;

export const difficultyLevels: Record<DifficultyId, DifficultyConfig> = {
  easy: { id: "easy", label: "简单", rows: 6, cols: 6, symbolCount: 12 },
  normal: { id: "normal", label: "一般", rows: 8, cols: 8, symbolCount: 32 },
  hard: { id: "hard", label: "困难", rows: 8, cols: 10, symbolCount: 32 },
};

export const difficultyList = [difficultyLevels.easy, difficultyLevels.normal, difficultyLevels.hard];

export const levelList: LevelConfig[] = [
  { id: "easy", label: "第1关", level: 1, subtitle: "4 x 5 夏日开场", rows: 4, cols: 5, symbolCount: 10, shiftMode: "none" },
  { id: "normal", label: "第2关", level: 2, subtitle: "6 x 7 缤纷果园", rows: 6, cols: 7, symbolCount: 21, shiftMode: "none" },
  { id: "normal", label: "第3关", level: 3, subtitle: "7 x 8 清凉海风", rows: 7, cols: 8, symbolCount: 28, shiftMode: "none" },
  { id: "hard", label: "第4关", level: 4, subtitle: "8 x 9 水果派对", rows: 8, cols: 9, symbolCount: 32, shiftMode: "none" },
  { id: "hard", label: "第5关", level: 5, subtitle: "13 x 8 同行向左移动", rows: 13, cols: 8, symbolCount: 32, shiftMode: "row-left" },
  { id: "hard", label: "第6关", level: 6, subtitle: "13 x 8 同行向右移动", rows: 13, cols: 8, symbolCount: 32, shiftMode: "row-right" },
  { id: "hard", label: "第7关", level: 7, subtitle: "13 x 8 同列向上移动", rows: 13, cols: 8, symbolCount: 32, shiftMode: "col-up" },
  { id: "hard", label: "第8关", level: 8, subtitle: "13 x 8 同行向右移动", rows: 13, cols: 8, symbolCount: 32, shiftMode: "row-right" },
];

export function getShiftInstructionText(mode: ShiftMode): string {
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

export const tileDeck: TileInfo[] = [
  { id: "strawberry", emoji: "🍓", icon: "莓", label: "草莓" },
  { id: "orange", emoji: "🍊", icon: "橙", label: "橙子" },
  { id: "lemon", emoji: "🍋", icon: "柠", label: "柠檬" },
  { id: "watermelon", emoji: "🍉", icon: "瓜", label: "西瓜" },
  { id: "grape", emoji: "🍇", icon: "葡", label: "葡萄" },
  { id: "peach", emoji: "🍑", icon: "桃", label: "桃子" },
  { id: "kiwi", emoji: "🥝", icon: "猕", label: "猕猴桃" },
  { id: "pineapple", emoji: "🍍", icon: "菠", label: "菠萝" },
  { id: "cherry", emoji: "🍒", icon: "樱", label: "樱桃" },
  { id: "coconut", emoji: "🥥", icon: "椰", label: "椰子" },
  { id: "apple", emoji: "🍎", icon: "苹", label: "苹果" },
  { id: "pear", emoji: "🍐", icon: "梨", label: "梨" },
  { id: "banana", emoji: "🍌", icon: "蕉", label: "香蕉" },
  { id: "blueberry", emoji: "🫐", icon: "蓝", label: "蓝莓" },
  { id: "green-apple", emoji: "🍏", icon: "青", label: "青苹果" },
  { id: "mushroom", emoji: "🍄", icon: "菇", label: "蘑菇" },
  { id: "corn", emoji: "🌽", icon: "玉", label: "玉米" },
  { id: "carrot", emoji: "🥕", icon: "胡", label: "胡萝卜" },
  { id: "cake", emoji: "🍰", icon: "糕", label: "蛋糕" },
  { id: "donut", emoji: "🍩", icon: "甜", label: "甜甜圈" },
  { id: "cookie", emoji: "🍪", icon: "饼", label: "饼干" },
  { id: "cupcake", emoji: "🧁", icon: "杯", label: "纸杯蛋糕" },
  { id: "popcorn", emoji: "🍿", icon: "米", label: "爆米花" },
  { id: "burger", emoji: "🍔", icon: "堡", label: "汉堡" },
  { id: "pizza", emoji: "🍕", icon: "披", label: "披萨" },
  { id: "sushi", emoji: "🍣", icon: "寿", label: "寿司" },
  { id: "shrimp", emoji: "🍤", icon: "虾", label: "炸虾" },
  { id: "dice", emoji: "🎲", icon: "骰", label: "骰子" },
  { id: "gamepad", emoji: "🎮", icon: "游", label: "游戏机" },
  { id: "guitar", emoji: "🎸", icon: "琴", label: "吉他" },
  { id: "plane", emoji: "✈️", icon: "机", label: "飞机" },
  { id: "bike", emoji: "🚲", icon: "车", label: "自行车" },
];

const directions = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
] as const;

function createEmptyBoard(rows = boardRows, cols = boardCols): Board {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function placeValuesInRows(values: Array<string | null>, rows = boardRows, cols = boardCols): Board {
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

function placeTilesInRows(symbolIds: string[], rows = boardRows, cols = boardCols): Board {
  return placeValuesInRows(symbolIds, rows, cols);
}

function buildPairedTiles(symbolIds: string[]): string[] {
  return symbolIds.flatMap((symbolId) => [symbolId, symbolId]);
}

function buildDifficultyTiles(difficulty: DifficultyConfig): string[] {
  const pairCount = (difficulty.rows * difficulty.cols) / 2;
  const symbolIds = tileDeck.slice(0, difficulty.symbolCount).map((tile) => tile.id);
  const pairIds = Array.from({ length: pairCount }, (_, index) => symbolIds[index % symbolIds.length]);

  return buildPairedTiles(pairIds);
}

function placeTilesAsRemovablePairs(tiles: string[], rows = boardRows, cols = boardCols): Board {
  const remaining = [...tiles];
  const pairIds: string[] = [];

  while (remaining.length > 0) {
    const tile = remaining.shift();

    if (!tile) {
      break;
    }

    const pairIndex = remaining.indexOf(tile);

    if (pairIndex === -1) {
      continue;
    }

    remaining.splice(pairIndex, 1);
    pairIds.push(tile);
  }

  const pairedTiles = shuffle(pairIds).flatMap((tile) => [tile, tile]);
  return placeValuesInRows([...pairedTiles, ...Array(rows * cols - pairedTiles.length).fill(null)], rows, cols);
}

function createSolvableBoardFromTiles(tiles: string[], rows = boardRows, cols = boardCols): Board {
  const totalCells = rows * cols;
  const values = [...tiles, ...Array(totalCells - tiles.length).fill(null)];

  for (let attempt = 0; attempt < 300; attempt += 1) {
    const board = placeValuesInRows(shuffle(values), rows, cols);

    if (canFullyClearBoard(board)) {
      return board;
    }
  }

  return placeTilesAsRemovablePairs(tiles, rows, cols);
}

function hasShiftMode(difficulty: DifficultyConfig): difficulty is LevelConfig {
  return "shiftMode" in difficulty && difficulty.shiftMode !== "none";
}

function countPairsClearableWithShift(board: Board, mode: ShiftMode): number {
  let nextBoard = board.map((row) => [...row]);
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

type ShiftBoardBand = {
  minRatio: number;
  maxRatio: number;
  targetRatio: number;
};

function pickShiftBoardBand(): ShiftBoardBand {
  const roll = Math.random();

  if (roll < 0.6) {
    return { minRatio: 0.5, maxRatio: 0.62, targetRatio: 0.56 };
  }

  if (roll < 0.9) {
    return { minRatio: 0.68, maxRatio: 0.82, targetRatio: 0.74 };
  }

  return { minRatio: 1, maxRatio: 1, targetRatio: 1 };
}

function countAdjacentSameTiles(board: Board): number {
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

      if (board[row + 1]?.[col] === tile) {
        count += 1;
      }
    }
  }

  return count;
}

function createShiftReadyBoardFromTiles(tiles: string[], difficulty: LevelConfig): Board {
  const totalPairs = tiles.length / 2;
  const band = pickShiftBoardBand();
  const maxAdjacentPairs = Math.max(10, Math.floor(totalPairs * 0.31));
  let bestBoard = placeTilesInRows(shuffle(tiles), difficulty.rows, difficulty.cols);
  let bestScore = Number.POSITIVE_INFINITY;
  const attemptLimit = band.targetRatio === 1 ? 900 : 700;

  for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
    const board = placeTilesInRows(shuffle(tiles), difficulty.rows, difficulty.cols);
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

function isInsideBoard(board: Board, row: number, col: number): boolean {
  return row >= 0 && row < board.length && col >= 0 && col < board[0].length;
}

function isInsideExtendedBoard(board: Board, row: number, col: number): boolean {
  return row >= -1 && row <= board.length && col >= -1 && col <= board[0].length;
}

function canVisitCell(board: Board, row: number, col: number, start: Cell, end: Cell): boolean {
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

type SearchState = {
  row: number;
  col: number;
  direction: number;
  turns: number;
};

function stateKey(state: SearchState): string {
  return `${state.row}:${state.col}:${state.direction}`;
}

export function searchConnectPath(board: Board, start: Cell, end: Cell): Cell[] | null {
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

  const queue: SearchState[] = [{ row: start.row, col: start.col, direction: -1, turns: 0 }];
  const visited = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const stateLookup = new Map<string, SearchState>();

  const startKey = stateKey(queue[0]);
  visited.set(startKey, 0);
  previous.set(startKey, null);
  stateLookup.set(startKey, queue[0]);

  while (queue.length > 0) {
    const current = queue.shift() as SearchState;
    const currentKey = stateKey(current);

    if (current.row === end.row && current.col === end.col) {
      const path: Cell[] = [];
      let key: string | null = currentKey;

      while (key) {
        const state = stateLookup.get(key);

        if (!state) {
          break;
        }

        path.push({ row: state.row, col: state.col });
        key = previous.get(key) ?? null;
      }

      return path.reverse();
    }

    directions.forEach((delta, direction) => {
      const nextRow = current.row + delta.row;
      const nextCol = current.col + delta.col;

      if (!canVisitCell(board, nextRow, nextCol, start, end)) {
        return;
      }

      const nextTurns =
        current.direction === -1 || current.direction === direction ? current.turns : current.turns + 1;

      if (nextTurns > 2) {
        return;
      }

      const nextState: SearchState = { row: nextRow, col: nextCol, direction, turns: nextTurns };
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

export function createBoard(difficulty = difficultyLevels.normal): Board {
  if (hasShiftMode(difficulty)) {
    return createShiftReadyBoardFromTiles(buildDifficultyTiles(difficulty), difficulty);
  }

  return createSolvableBoardFromTiles(buildDifficultyTiles(difficulty), difficulty.rows, difficulty.cols);
}

export function shuffleBoard(board: Board): Board {
  const remainingTiles = board.flat().filter((tile): tile is string => tile !== null);
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  return createSolvableBoardFromTiles(remainingTiles, rows, cols);
}

function countRemainingPairs(board: Board): number {
  return countRemainingTiles(board) / 2;
}

export function countAvailableMatches(board: Board): number {
  let matches = 0;
  const positionsById = new Map<string, Cell[]>();

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const tile = board[row][col];

      if (!tile) {
        continue;
      }

      const positions = positionsById.get(tile) ?? [];
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

export function shuffleBoardPreservingLayout(board: Board): Board {
  const occupiedCells: Cell[] = [];
  const remainingTiles: string[] = [];

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
    const nextBoard: Board = board.map((row) => row.map(() => null));
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

function normalizeLayoutForShiftMode(board: Board, mode: ShiftMode): Board {
  if (mode === "row-left") {
    return board.map((row) => compactRowLeft(row));
  }

  if (mode === "row-right") {
    return board.map((row) => compactRowRight(row));
  }

  if (mode === "col-up" || mode === "col-down") {
    let nextBoard = board.map((row) => [...row]);
    const colCount = nextBoard[0]?.length ?? 0;

    for (let col = 0; col < colCount; col += 1) {
      nextBoard = compactColumn(nextBoard, col, mode);
    }

    return nextBoard;
  }

  return board;
}

export function shuffleBoardForShiftMode(board: Board, mode: ShiftMode): Board {
  return shuffleBoardPreservingLayout(normalizeLayoutForShiftMode(board, mode));
}

export function ensurePlayableBoard(board: Board): Board {
  if (countRemainingTiles(board) === 0 || canFullyClearBoard(board)) {
    return board;
  }

  return shuffleBoard(board);
}

export function removePair(board: Board, a: Cell, b: Cell): Board {
  const nextBoard = board.map((row) => [...row]);
  nextBoard[a.row][a.col] = null;
  nextBoard[b.row][b.col] = null;
  return nextBoard;
}

function compactRowLeft(row: Array<string | null>): Array<string | null> {
  const values = row.filter((tile): tile is string => tile !== null);
  return [...values, ...Array(row.length - values.length).fill(null)];
}

function compactRowRight(row: Array<string | null>): Array<string | null> {
  const values = row.filter((tile): tile is string => tile !== null);
  return [...Array(row.length - values.length).fill(null), ...values];
}

function compactColumn(board: Board, col: number, mode: "col-up" | "col-down"): Board {
  const nextBoard = board.map((row) => [...row]);
  const values = nextBoard.map((row) => row[col]).filter((tile): tile is string => tile !== null);
  const blanks = Array(nextBoard.length - values.length).fill(null);
  const nextValues = mode === "col-up" ? [...values, ...blanks] : [...blanks, ...values];

  nextValues.forEach((tile, row) => {
    nextBoard[row][col] = tile;
  });

  return nextBoard;
}

export function applyShiftAfterRemove(board: Board, cells: Cell[], mode: ShiftMode): Board {
  if (mode === "none") {
    return board;
  }

  let nextBoard = board.map((row) => [...row]);

  if (mode === "row-left" || mode === "row-right") {
    const affectedRows = [...new Set(cells.map((cell) => cell.row))];
    affectedRows.forEach((row) => {
      nextBoard[row] = mode === "row-left" ? compactRowLeft(nextBoard[row]) : compactRowRight(nextBoard[row]);
    });
    return nextBoard;
  }

  const affectedCols = [...new Set(cells.map((cell) => cell.col))];
  affectedCols.forEach((col) => {
    nextBoard = compactColumn(nextBoard, col, mode);
  });

  return nextBoard;
}

export function countRemainingTiles(board: Board): number {
  return board.flat().filter((tile) => tile !== null).length;
}

export function canConnect(board: Board, start: Cell, end: Cell): boolean {
  return searchConnectPath(board, start, end) !== null;
}

export function canFullyClearBoard(board: Board): boolean {
  let nextBoard = board.map((row) => [...row]);

  while (countRemainingTiles(nextBoard) > 0) {
    const pair = findAnyMatch(nextBoard);

    if (!pair) {
      return false;
    }

    nextBoard = removePair(nextBoard, pair.start, pair.end);
  }

  return true;
}

export function findAnyMatch(board: Board): { start: Cell; end: Cell } | null {
  const positionsById = new Map<string, Cell[]>();

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const tile = board[row][col];

      if (!tile) {
        continue;
      }

      const positions = positionsById.get(tile) ?? [];
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
