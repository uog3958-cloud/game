
export enum GameStatus {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  WON = 'WON'
}

export interface GameLog {
  guess: number;
  result: 'UP' | 'DOWN' | 'CORRECT';
  aiComment: string;
  timestamp: number;
}
