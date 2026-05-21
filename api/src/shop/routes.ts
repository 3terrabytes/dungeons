import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { rollShop } from "../game/loot.js";
import { itemsById } from "@dungeons/shared/content/items";
import { loadPublicUser } from "../game/user.js";
import type { ItemDef } from "@dungeons/shared";

export const shopRouter = Router();

interface ShopRow {
  items: string[];
  rolled_at: string;
}

const REFRESH_WINDOW_MS = 30 * 60 * 1000;

async function ensureRoll(userId: string, force = false): Promise<ItemDef[]> {
  const cur = await query<ShopRow>(
    `SELECT items, rolled_at FROM shop_rolls WHERE user_id = $1`,
    [userId]
  );
  const fresh = cur.rows[0];
  if (
    !force &&
    fresh &&
    Date.now() - new Date(fresh.rolled_at).getTime() < REFRESH_WINDOW_MS
  ) {
    return fresh.items.map((id) => itemsById[id]).filter((x): x is ItemDef => !!x);
  }
  const ids = rollShop(Math.random).map((i) => i.id);
  await query(
    `INSERT INTO shop_rolls (user_id, items, rolled_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, rolled_at = NOW()`,
    [userId, JSON.stringify(ids)]
  );
  return ids.map((id) => itemsById[id]).filter((x): x is ItemDef => !!x);
}

shopRouter.get("/", async (req, res) => {
  const items = await ensureRoll(req.session!.uid);
  res.json({ items });
});

const REFRESH_COST = 50;

shopRouter.post("/reroll", async (req, res) => {
  const userId = req.session!.uid;
  const u = await query<{ gold: number }>(`SELECT gold FROM users WHERE id = $1`, [userId]);
  if (!u.rowCount || u.rows[0].gold < REFRESH_COST) {
    res.status(400).json({ error: "not_enough_gold" });
    return;
  }
  await query(`UPDATE users SET gold = gold - $1 WHERE id = $2`, [REFRESH_COST, userId]);
  const items = await ensureRoll(userId, true);
  const user = await loadPublicUser(userId);
  res.json({ items, user });
});

const purchaseSchema = z.object({ itemId: z.string().min(1).max(64) });

shopRouter.post("/purchase", async (req, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const userId = req.session!.uid;
  const roll = await query<ShopRow>(
    `SELECT items, rolled_at FROM shop_rolls WHERE user_id = $1`,
    [userId]
  );
  if (!roll.rowCount || !roll.rows[0].items.includes(parsed.data.itemId)) {
    res.status(400).json({ error: "item_not_in_shop" });
    return;
  }
  const item = itemsById[parsed.data.itemId];
  if (!item) {
    res.status(404).json({ error: "item_unknown" });
    return;
  }
  const u = await query<{ gold: number }>(`SELECT gold FROM users WHERE id = $1`, [userId]);
  if (!u.rowCount || u.rows[0].gold < item.basePrice) {
    res.status(400).json({ error: "not_enough_gold" });
    return;
  }
  const newItems = roll.rows[0].items.filter((id) => id !== parsed.data.itemId);
  await query(`UPDATE users SET gold = gold - $1 WHERE id = $2`, [item.basePrice, userId]);
  await query(`INSERT INTO user_items (user_id, item_id) VALUES ($1, $2)`, [userId, item.id]);
  await query(`UPDATE shop_rolls SET items = $1 WHERE user_id = $2`, [
    JSON.stringify(newItems),
    userId,
  ]);
  const user = await loadPublicUser(userId);
  res.json({ user, purchased: item });
});
