import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { itemsById } from "@dungeons/shared/content/items";
import { loadPublicUser } from "./user.js";
import type { ItemSlot } from "@dungeons/shared";

export const inventoryRouter = Router();

inventoryRouter.get("/", async (req, res) => {
  const r = await query<{ id: string; item_id: string }>(
    `SELECT id, item_id FROM user_items WHERE user_id = $1 ORDER BY acquired_at DESC`,
    [req.session!.uid]
  );
  const items = r.rows
    .map((row) => {
      const def = itemsById[row.item_id];
      return def ? { userItemId: row.id, item: def } : null;
    })
    .filter((x): x is { userItemId: string; item: typeof itemsById[string] } => x !== null);
  res.json({ items });
});

const equipSchema = z.object({
  slot: z.enum([
    "weapon",
    "offhand",
    "armour",
    "helmet",
    "boots",
    "ring",
    "amulet",
    "banner",
  ]),
  userItemId: z.string().uuid().nullable(),
});

inventoryRouter.post("/equip", async (req, res) => {
  const parsed = equipSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const userId = req.session!.uid;
  const { slot, userItemId } = parsed.data;

  let itemIdToEquip: string | null = null;
  if (userItemId) {
    const r = await query<{ item_id: string }>(
      `SELECT item_id FROM user_items WHERE id = $1 AND user_id = $2`,
      [userItemId, userId]
    );
    if (!r.rowCount) {
      res.status(404).json({ error: "item_not_owned" });
      return;
    }
    const def = itemsById[r.rows[0].item_id];
    if (!def) {
      res.status(404).json({ error: "item_unknown" });
      return;
    }
    if (def.slot !== slot) {
      res.status(400).json({ error: "wrong_slot" });
      return;
    }
    itemIdToEquip = def.id;
  }

  const cur = await query<{ equipped: Partial<Record<ItemSlot, string>> }>(
    `SELECT equipped FROM users WHERE id = $1`,
    [userId]
  );
  const equipped = cur.rows[0]?.equipped ?? {};
  if (itemIdToEquip) {
    equipped[slot] = itemIdToEquip;
  } else {
    delete equipped[slot];
  }
  await query(`UPDATE users SET equipped = $1 WHERE id = $2`, [
    JSON.stringify(equipped),
    userId,
  ]);
  const user = await loadPublicUser(userId);
  res.json({ user });
});
