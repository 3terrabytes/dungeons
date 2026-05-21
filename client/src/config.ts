// Central balance + constants. Tweak here, not in entities.

export const TILE_SIZE = 16;

export const DUNGEON = {
  width: 64,
  height: 48,
  minRoomSize: 6,
  maxRoomSize: 12,
  roomAttempts: 24,
  floorsBeforeBoss: 3,
};

export const PLAYER = {
  baseHp: 100,
  baseAtk: 10,
  baseDef: 0,
  baseSpd: 160,
  iFramesMs: 600,
  meleeCooldownMs: 350,
  meleeRange: 28,
  meleeArcDeg: 70,
  rangedCooldownMs: 260,
  projectileSpeed: 360,
  projectileLifeMs: 700,
};

export const ENEMY = {
  meleeHp: 18,
  meleeAtk: 8,
  meleeSpd: 80,
  meleeContactCooldownMs: 700,
  rangedHp: 14,
  rangedAtk: 6,
  rangedSpd: 60,
  rangedIdealDistance: 180,
  rangedFireCooldownMs: 900,
  rangedProjectileSpeed: 220,
  bossHp: 600,
  bossAtk: 18,
  bossSpd: 50,
};

export const LOOT = {
  xpPerKill: { melee: 8, ranged: 10, boss: 120 },
  goldRange: { melee: [3, 8], ranged: [5, 12], boss: [80, 140] } as const,
  magnetRadius: 110,
  pickupRadius: 14,
  maxPullSpeed: 360,
};

export const PROGRESSION = {
  xpToNext: (level: number) => Math.floor(50 * Math.pow(level, 1.5)),
  perLevel: { maxHp: 10, atk: 2, def: 1 },
};

export const COLORS = {
  bg: 0x0b0b12,
  floor: 0x2a2438,
  wall: 0x141220,
  player: 0xf5d76e,
  enemyMelee: 0xe55934,
  enemyRanged: 0x9bc53d,
  boss: 0xc73e3a,
  projectilePlayer: 0xfff6a6,
  projectileEnemy: 0xff6b6b,
  xp: 0x4cd1ff,
  gold: 0xffd166,
  uiPanel: 0x1a1a2e,
  uiBorder: 0x4a4a6a,
  uiText: 0xeeeeee,
  hpBar: 0xe63946,
  xpBar: 0x4cc9f0,
};
