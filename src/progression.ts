import { type LevelConfig } from "./game";

export type CompletionRatingInput = {
  level: number;
  seconds: number;
  moves: number;
  hintsUsed: number;
  maxCombo: number;
  challenge: boolean;
};

export type CompletionRating = {
  stars: 1 | 2 | 3;
  targetSeconds: number;
  targetMoves: number;
};

function getTargetSeconds(level: number, challenge: boolean): number {
  const base = 90 + level * 15;
  return challenge ? Math.max(60, Math.floor(base * 0.78)) : base;
}

function getTargetMoves(level: number, challenge: boolean): number {
  const base = 34 + level * 6;
  return challenge ? Math.max(24, Math.floor(base * 0.82)) : base;
}

export function calculateCompletionRating(input: CompletionRatingInput): CompletionRating {
  const targetSeconds = getTargetSeconds(input.level, input.challenge);
  const targetMoves = getTargetMoves(input.level, input.challenge);
  let stars: 1 | 2 | 3 = 1;

  if (input.seconds <= targetSeconds && input.hintsUsed <= 1) {
    stars = 2;
  }

  if (stars === 2 && input.moves <= targetMoves && input.maxCombo >= 3 && input.hintsUsed === 0) {
    stars = 3;
  }

  return { stars, targetSeconds, targetMoves };
}

export function nextComboAfterMatch(currentCombo: number): number {
  return currentCombo + 1;
}

export function getChallengeLevel(levels: LevelConfig[]): LevelConfig {
  return levels.find((level) => level.level >= 5) || levels[levels.length - 1];
}

export function getCompletionTitle(stars: number): string {
  if (stars >= 3) {
    return "三星通关";
  }

  if (stars === 2) {
    return "顺利通关";
  }

  return "继续加油";
}
