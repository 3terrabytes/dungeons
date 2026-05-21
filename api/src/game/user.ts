import { query } from "../db/pool.js";
import type { PublicUser, ItemSlot } from "@dungeons/shared";
import { itemsById } from "@dungeons/shared/content/items";
import { movesById } from "@dungeons/shared/content/moves";

interface UserRow {
  id: string;
  username: string;
  level: number;
  xp: number;
  gold: number;
  equipped: Partial<Record<ItemSlot, string>>;
}

export async function loadPublicUser(userId: string): Promise<PublicUser | null> {
  const r = await query<UserRow>(
    `SELECT id, username, level, xp, gold, equipped FROM users WHERE id = $1`,
    [userId]
  );
  if (!r.rowCount) return null;
  const u = r.rows[0];
  return {
    id: u.id,
    username: u.username,
    level: u.level,
    xp: u.xp,
    gold: u.gold,
    bannerItemId: u.equipped?.banner ?? null,
    equipped: u.equipped ?? {},
  };
}

export interface CombatStats {
  maxHp: number;
  defense: number;
  damageBonus: number;
  critChance: number;
  moveSpeed: number;
  goldBonus: number;
  xpBonus: number;
  lifesteal: number;
  weaponMoveId: string | null;
  weaponMoveDps: number;
}

const BASE_HP = 100;
const BASE_SPEED = 1;

export async function computeCombatStats(userId: string): Promise<CombatStats> {
  const r = await query<{ equipped: Partial<Record<ItemSlot, string>> }>(
    `SELECT equipped FROM users WHERE id = $1`,
    [userId]
  );
  const equipped = r.rows[0]?.equipped ?? {};
  const stats: CombatStats = {
    maxHp: BASE_HP,
    defense: 0,
    damageBonus: 0,
    critChance: 0,
    moveSpeed: BASE_SPEED,
    goldBonus: 0,
    xpBonus: 0,
    lifesteal: 0,
    weaponMoveId: null,
    weaponMoveDps: 0,
  };
  for (const slot of Object.keys(equipped) as ItemSlot[]) {
    const itemId = equipped[slot];
    if (!itemId) continue;
    const item = itemsById[itemId];
    if (!item) continue;
    stats.maxHp += item.stats.hp ?? 0;
    stats.defense += item.stats.defense ?? 0;
    stats.damageBonus += item.stats.damage ?? 0;
    stats.critChance += item.stats.critChance ?? 0;
    stats.moveSpeed += item.stats.moveSpeed ?? 0;
    stats.goldBonus += item.stats.goldBonus ?? 0;
    stats.xpBonus += item.stats.xpBonus ?? 0;
    stats.lifesteal += item.stats.lifesteal ?? 0;
    if (slot === "weapon" && item.moveId) {
      stats.weaponMoveId = item.moveId;
      const move = movesById[item.moveId];
      if (move) {
        const effective = (move.baseDamage + (item.stats.damage ?? 0)) *
          (1 + stats.critChance * 0.5);
        stats.weaponMoveDps = effective / (move.cooldownMs / 1000);
      }
    }
  }
  if (stats.moveSpeed < 0.3) stats.moveSpeed = 0.3;
  return stats;
}

export function xpForLevelStep(n: number): number {
  return Math.floor(50 * Math.pow(n, 1.5));
}

export function totalXpAtLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevelStep(i);
  return total;
}

export function levelFromTotalXp(xp: number): number {
  let lvl = 1;
  let acc = 0;
  while (true) {
    const step = xpForLevelStep(lvl);
    if (acc + step > xp) return lvl;
    acc += step;
    lvl += 1;
    if (lvl > 999) return lvl;
  }
}

export function progressInLevel(xp: number): { level: number; into: number; needed: number } {
  const level = levelFromTotalXp(xp);
  const into = xp - totalXpAtLevel(level);
  const needed = xpForLevelStep(level);
  return { level, into, needed };
}

export async function recomputeLevel(userId: string): Promise<void> {
  const r = await query<{ xp: number }>(`SELECT xp FROM users WHERE id = $1`, [userId]);
  const total = r.rows[0]?.xp ?? 0;
  const level = levelFromTotalXp(total);
  await query(`UPDATE users SET level = $1 WHERE id = $2`, [level, userId]);
}
