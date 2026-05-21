import { DUNGEON } from '../config';

export const TILE = { FLOOR: 0, WALL: 1, DOOR: 2 } as const;

export interface Rect { x: number; y: number; w: number; h: number; }

export interface DungeonMap {
  tiles: number[][];           // [y][x]
  rooms: Rect[];
  spawn: { x: number; y: number };       // tile coords
  exit: { x: number; y: number };
  enemySpawns: { x: number; y: number; tier: 'melee' | 'ranged' }[];
  bossRoom: Rect | null;
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

const center = (r: Rect) => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });

const overlaps = (a: Rect, b: Rect) =>
  a.x <= b.x + b.w + 1 && a.x + a.w + 1 >= b.x &&
  a.y <= b.y + b.h + 1 && a.y + a.h + 1 >= b.y;

function carveRoom(tiles: number[][], r: Rect): void {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      tiles[y]![x] = TILE.FLOOR;
}

function carveCorridor(tiles: number[][], a: { x: number; y: number }, b: { x: number; y: number }, rng: () => number): void {
  // L-shaped — randomly pick horizontal-first or vertical-first
  if (rng() < 0.5) {
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) tiles[a.y]![x] = TILE.FLOOR;
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) tiles[y]![b.x] = TILE.FLOOR;
  } else {
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) tiles[y]![a.x] = TILE.FLOOR;
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) tiles[b.y]![x] = TILE.FLOOR;
  }
}

export function generateDungeon(seed: number, isBossFloor: boolean): DungeonMap {
  const rng = mulberry32(seed);
  const { width, height, minRoomSize, maxRoomSize, roomAttempts } = DUNGEON;

  const tiles: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.WALL),
  );

  const rooms: Rect[] = [];
  for (let i = 0; i < roomAttempts; i++) {
    const w = randInt(rng, minRoomSize, maxRoomSize);
    const h = randInt(rng, minRoomSize, maxRoomSize);
    const x = randInt(rng, 1, width - w - 2);
    const y = randInt(rng, 1, height - h - 2);
    const r: Rect = { x, y, w, h };
    if (!rooms.some((o) => overlaps(o, r))) rooms.push(r);
  }
  if (rooms.length === 0) {
    // Pathological fallback — single central room
    const fallback: Rect = { x: 4, y: 4, w: 20, h: 14 };
    rooms.push(fallback);
  }

  rooms.forEach((r) => carveRoom(tiles, r));
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(tiles, center(rooms[i - 1]!), center(rooms[i]!), rng);
  }

  const spawnRoom = rooms[0]!;
  const exitRoom  = rooms[rooms.length - 1]!;

  // Enemy spawns scatter in middle rooms
  const enemySpawns: DungeonMap['enemySpawns'] = [];
  for (let i = 1; i < rooms.length - 1; i++) {
    const r = rooms[i]!;
    const count = randInt(rng, 2, 4);
    for (let n = 0; n < count; n++) {
      const ex = randInt(rng, r.x + 1, r.x + r.w - 2);
      const ey = randInt(rng, r.y + 1, r.y + r.h - 2);
      enemySpawns.push({ x: ex, y: ey, tier: rng() < 0.6 ? 'melee' : 'ranged' });
    }
  }

  return {
    tiles,
    rooms,
    spawn: center(spawnRoom),
    exit: center(exitRoom),
    enemySpawns,
    bossRoom: isBossFloor ? exitRoom : null,
  };
}
