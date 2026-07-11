import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyShiftAfterRemove,
  canConnect,
  canFullyClearBoard,
  createBoard,
  countAvailableMatches,
  difficultyLevels,
  ensurePlayableBoard,
  findAnyMatch,
  getShiftInstructionText,
  levelList,
  removePair,
  shuffleBoard,
  shuffleBoardForShiftMode,
  shuffleBoardPreservingLayout,
  type Board,
  type ShiftMode,
} from "./game";

describe("game logic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a full 8x8 board with paired tiles", () => {
    const board = createBoard();

    expect(board).toHaveLength(8);
    expect(board.every((row) => row.length === 8)).toBe(true);
    expect(board.flat().every((tile) => tile !== null)).toBe(true);
    expect(findAnyMatch(board)).not.toBeNull();
  });

  it("creates boards with different sizes for each difficulty", () => {
    const easy = createBoard(difficultyLevels.easy);
    const normal = createBoard(difficultyLevels.normal);
    const hard = createBoard(difficultyLevels.hard);

    expect(easy).toHaveLength(6);
    expect(easy.every((row) => row.length === 6)).toBe(true);
    expect(normal).toHaveLength(8);
    expect(normal.every((row) => row.length === 8)).toBe(true);
    expect(hard).toHaveLength(8);
    expect(hard.every((row) => row.length === 10)).toBe(true);
  });

  it("creates boards that can be fully cleared for every difficulty", () => {
    expect(canFullyClearBoard(createBoard(difficultyLevels.easy))).toBe(true);
    expect(canFullyClearBoard(createBoard(difficultyLevels.normal))).toBe(true);
    expect(canFullyClearBoard(createBoard(difficultyLevels.hard))).toBe(true);
  });

  it("uses the requested level sizes", () => {
    expect(levelList.map((level) => [level.rows, level.cols])).toEqual([
      [4, 5],
      [6, 7],
      [7, 8],
      [8, 9],
      [13, 8],
      [13, 8],
      [13, 8],
      [13, 8],
    ]);
  });

  it("uses the requested later-level shift directions", () => {
    expect(levelList.slice(4).map((level) => level.shiftMode)).toEqual(["row-left", "row-right", "col-up", "row-right"]);
  });

  it("describes the movement rule for later levels", () => {
    expect(levelList.slice(4).map((level) => getShiftInstructionText(level.shiftMode))).toEqual([
      "消除后会向左移动",
      "消除后会向右移动",
      "消除后会向上移动",
      "消除后会向右移动",
    ]);
  });

  function countPairsClearableWithShift(board: Board, mode: ShiftMode): number {
    let nextBoard = board.map((row) => [...row]);
    let clearedPairs = 0;

    while (true) {
      const pair = findAnyMatch(nextBoard);

      if (!pair) {
        return clearedPairs;
      }

      nextBoard = applyShiftAfterRemove(removePair(nextBoard, pair.start, pair.end), [pair.start, pair.end], mode);
      clearedPairs += 1;
    }
  }

  it("creates shift-level boards with at least half the pairs clearable before refresh", () => {
    for (const level of levelList.slice(4)) {
      const board = createBoard(level);
      const totalPairs = board.flat().filter((tile) => tile !== null).length / 2;

      expect(countPairsClearableWithShift(board, level.shiftMode)).toBeGreaterThanOrEqual(Math.floor(totalPairs * 0.5));
    }
  }, 20000);

  function mockProfileRollThenSeededRandom(profileRoll: number) {
    let calls = 0;
    let seed = 123456 + Math.floor(profileRoll * 1000);
    vi.spyOn(Math, "random").mockImplementation(() => {
      calls += 1;

      if (calls === 1) {
        return profileRoll;
      }

      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    });
  }

  function clearableRatio(board: Board, mode: ShiftMode): number {
    const totalPairs = board.flat().filter((tile) => tile !== null).length / 2;
    return countPairsClearableWithShift(board, mode) / totalPairs;
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

  it("creates shift-level boards in the requested 50, 70, and 100 percent bands", () => {
    for (const level of levelList.slice(4)) {
      mockProfileRollThenSeededRandom(0.1);
      const commonRatio = clearableRatio(createBoard(level), level.shiftMode);
      expect(commonRatio).toBeGreaterThanOrEqual(0.5);
      expect(commonRatio).toBeLessThanOrEqual(0.62);
      vi.restoreAllMocks();

      mockProfileRollThenSeededRandom(0.7);
      const strongRatio = clearableRatio(createBoard(level), level.shiftMode);
      expect(strongRatio).toBeGreaterThanOrEqual(0.68);
      expect(strongRatio).toBeLessThanOrEqual(0.82);
      vi.restoreAllMocks();

      mockProfileRollThenSeededRandom(0.95);
      const fullRatio = clearableRatio(createBoard(level), level.shiftMode);
      expect(fullRatio).toBe(1);
      vi.restoreAllMocks();
    }
  }, 20000);

  it("does not make shift-level boards out of mostly adjacent pairs", () => {
    mockProfileRollThenSeededRandom(0.1);

    const board = createBoard(levelList[4]);

    expect(countAdjacentSameTiles(board)).toBeLessThanOrEqual(16);
  });

  it("refreshes shift levels with several available matches while preserving the collapsed layout", () => {
    const board = [
      ["strawberry", "orange", "lemon", "peach", null, null],
      ["grape", "kiwi", "banana", null, null, null],
      ["orange", "strawberry", "peach", "lemon", null, null],
      ["banana", "kiwi", "grape", null, null, null],
    ];

    const nextBoard = shuffleBoardForShiftMode(board, "row-left");

    nextBoard.forEach((row) => {
      const firstEmpty = row.findIndex((tile) => tile === null);

      if (firstEmpty !== -1) {
        expect(row.slice(firstEmpty).every((tile) => tile === null)).toBe(true);
      }
    });
    expect(nextBoard.flat().sort()).toEqual(board.flat().sort());
    expect(countAvailableMatches(nextBoard)).toBeGreaterThanOrEqual(3);
  });

  it("reshuffles a dead board into a playable one", () => {
    const deadBoard = [
      ["strawberry", "orange"],
      ["orange", "strawberry"],
    ];

    expect(findAnyMatch(deadBoard)).toBeNull();

    const nextBoard = ensurePlayableBoard(deadBoard);

    expect(nextBoard.flat().sort()).toEqual(deadBoard.flat().sort());
    expect(findAnyMatch(nextBoard)).not.toBeNull();
  });

  it("shuffles remaining tiles into a board that can be fully cleared", () => {
    const board = [
      ["strawberry", "orange", "lemon", "lemon"],
      ["orange", "strawberry", null, null],
    ];

    const nextBoard = shuffleBoard(board);

    expect(nextBoard.flat().sort()).toEqual(board.flat().sort());
    expect(canFullyClearBoard(nextBoard)).toBe(true);
  });

  it("refreshes remaining tiles without changing the current empty-cell layout", () => {
    const board = [
      ["strawberry", null, "orange", "lemon"],
      ["orange", "strawberry", null, "lemon"],
      [null, "peach", "peach", null],
    ];

    const nextBoard = shuffleBoardPreservingLayout(board);
    const emptyLayout = (value: string | null) => value === null;

    expect(nextBoard.map((row) => row.map(emptyLayout))).toEqual(board.map((row) => row.map(emptyLayout)));
    expect(nextBoard.flat().sort()).toEqual(board.flat().sort());
    expect(countAvailableMatches(nextBoard)).toBeGreaterThan(0);
  });

  it("refreshes row-left levels into the current left-shifted layout", () => {
    const board = [
      [null, "strawberry", null, "orange", "lemon"],
      ["orange", null, "strawberry", null, "lemon"],
      [null, null, "peach", "peach", null],
    ];

    const nextBoard = shuffleBoardForShiftMode(board, "row-left");

    nextBoard.forEach((row) => {
      const firstEmpty = row.findIndex((tile) => tile === null);

      if (firstEmpty === -1) {
        return;
      }

      expect(row.slice(firstEmpty).every((tile) => tile === null)).toBe(true);
    });
    expect(nextBoard.flat().sort()).toEqual(board.flat().sort());
    expect(countAvailableMatches(nextBoard)).toBeGreaterThan(0);
  });

  it("moves only the affected rows or columns toward the level direction", () => {
    const rowLeftBoard = [
      ["a", null, "b", "c"],
      ["d", "e", null, "f"],
    ];
    const rowRightBoard = [
      ["a", null, "b", "c"],
      ["d", "e", null, "f"],
    ];
    const colUpBoard = [
      ["a", "b"],
      [null, "c"],
      ["d", null],
    ];

    expect(applyShiftAfterRemove(rowLeftBoard, [{ row: 0, col: 1 }], "row-left")).toEqual([
      ["a", "b", "c", null],
      ["d", "e", null, "f"],
    ]);
    expect(applyShiftAfterRemove(rowRightBoard, [{ row: 1, col: 2 }], "row-right")).toEqual([
      ["a", null, "b", "c"],
      [null, "d", "e", "f"],
    ]);
    expect(applyShiftAfterRemove(colUpBoard, [{ row: 1, col: 0 }], "col-up")).toEqual([
      ["a", "b"],
      ["d", "c"],
      [null, null],
    ]);
  });

  it("randomizes paired tiles instead of mirroring every row", () => {
    let calls = 0;
    vi.spyOn(Math, "random").mockImplementation(() => {
      calls += 1;
      return ((calls * 17) % 97) / 97;
    });

    const board = createBoard();
    const isFullyMirrored = board.every((row) =>
      row.every((tile, col) => tile === row[row.length - 1 - col]),
    );

    expect(isFullyMirrored).toBe(false);
  });

  it("connects a pair around the board edge with at most two turns", () => {
    const board = [
      ["🍓", "🍋", "🍊", "🍓"],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];

    expect(canConnect(board, { row: 0, col: 0 }, { row: 0, col: 3 })).toBe(true);
  });
});
