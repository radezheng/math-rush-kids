export type Phase = 'ready' | 'playing' | 'result';

export interface GameState {
  phase: Phase;
  score: number;
  bestScore: number;
  playerY: number;
  playerVelocity: number;
  obstacleX: number;
  obstacleGapY: number;
  elapsed: number;
}

export function createInitialState(bestScore = 0): GameState {
  return {
    phase: 'ready',
    score: 0,
    bestScore,
    playerY: 320,
    playerVelocity: 0,
    obstacleX: 420,
    obstacleGapY: 320,
    elapsed: 0,
  };
}
