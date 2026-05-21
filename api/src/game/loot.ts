import { ITEMS, RARITY_WEIGHTS } from "@dungeons/shared/content/items";
import type { ItemDef, Rarity } from "@dungeons/shared";

function rollRarity(rng: () => number, boost = 0): Rarity {
  const adjusted: Record<string, number> = { ...RARITY_WEIGHTS };
  if (boost > 0) {
    adjusted.common = Math.max(1, adjusted.common - boost * 30);
    adjusted.rare += boost * 10;
    adjusted.epic += boost * 6;
    adjusted.legendary += boost * 2;
  }
  const total = Object.values(adjusted).reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of Object.entries(adjusted)) {
    r -= w;
    if (r <= 0) return k as Rarity;
  }
  return "common";
}

export function rollLoot(rng: () => number, boost = 0): ItemDef | null {
  const rarity = rollRarity(rng, boost);
  const pool = ITEMS.filter((i) => i.rarity === rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function rollShop(rng: () => number, slots = 6): ItemDef[] {
  const out: ItemDef[] = [];
  for (let i = 0; i < slots; i++) {
    const item = rollLoot(rng);
    if (item) out.push(item);
  }
  return out;
}
