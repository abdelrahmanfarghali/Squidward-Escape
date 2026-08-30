import { Obstacle, MAP_WIDTH, MAP_HEIGHT } from './types.js';

export const OBSTACLES: Obstacle[] = [
  // Border walls
  { x: 0, y: 0, w: MAP_WIDTH, h: 20 },
  { x: 0, y: MAP_HEIGHT - 20, w: MAP_WIDTH, h: 20 },
  { x: 0, y: 0, w: 20, h: MAP_HEIGHT },
  { x: MAP_WIDTH - 20, y: 0, w: 20, h: MAP_HEIGHT },
  
  // Random obstacles in the map
  { x: 300, y: 300, w: 200, h: 50 },
  { x: 600, y: 150, w: 50, h: 300 },
  { x: 200, y: 800, w: 150, h: 150 },
  { x: 800, y: 600, w: 300, h: 50 },
  { x: 1200, y: 300, w: 50, h: 400 },
  { x: 1500, y: 800, w: 200, h: 200 },
  { x: 400, y: 1300, w: 400, h: 50 },
  { x: 1000, y: 1200, w: 50, h: 300 },
  { x: 1600, y: 1400, w: 150, h: 300 },
  { x: 700, y: 1600, w: 250, h: 50 },
  { x: 1300, y: 1700, w: 50, h: 200 }
];

export function checkCollision(newX: number, newY: number, size: number): boolean {
  for (const obs of OBSTACLES) {
    if (
      newX < obs.x + obs.w &&
      newX + size > obs.x &&
      newY < obs.y + obs.h &&
      newY + size > obs.y
    ) {
      return true; // Collision detected
    }
  }
  return false;
}
