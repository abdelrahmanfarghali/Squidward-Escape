export type Role = 'SHAFIQ' | 'SPONGEBOB' | 'SANDY' | 'PATRICK' | 'PLANKTON';

export type PowerUpType = 'SPEED' | 'SHIELD';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  x: number;
  y: number;
  isCalling: boolean;
  ready: boolean;
  isHost: boolean;
  score: number; // We might want to keep track of wins over multiple rounds
  isBot?: boolean;
  activePowerUp?: PowerUpType | null;
  powerUpExpiresAt?: number;
  lastCollisionTime?: number;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'GAME_OVER';

export interface GameState {
  roomId: string;
  status: GameStatus;
  players: Record<string, Player>;
  anger: number;
  maxAnger: number;
  winner: 'SHAFIQ' | 'CHASERS' | null;
  maxPlayers: number;
  isPractice: boolean;
  powerUps: PowerUp[];
}

// Map Configuration
export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = 2000;
export const HOUSE_X = MAP_WIDTH - 200;
export const HOUSE_Y = MAP_HEIGHT - 200;
export const HOUSE_SIZE = 150;
export const PLAYER_SIZE = 72; // Increased player size
export const PROXIMITY_RADIUS = 250;
export const CALL_COOLDOWN = 1000;
export const POWERUP_SIZE = 40;

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}
