import { Router } from "express";
import { query } from "../db/pool.js";
import { itemsById } from "@dungeons/shared/content/items";

export const leaderboardRouter = Router();
export const profileRouter = Router();

interface LbRow {
  id: string;
  username: string;
  level: number;
  xp: number;
  equipped: Record<string, string>;
}

leaderboardRouter.get("/", async (req, res) => {
  const scope = req.query.scope === "friends" ? "friends" : "global";
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 100);
  if (scope === "friends" && !req.session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  let rows: LbRow[];
  if (scope === "friends") {
    const r = await query<LbRow>(
      `SELECT u.id, u.username, u.level, u.xp, u.equipped
       FROM users u
       WHERE u.id = $1
          OR u.id IN (
            SELECT CASE WHEN user_a = $1 THEN user_b ELSE user_a END
            FROM friendships
            WHERE status = 'accepted' AND (user_a = $1 OR user_b = $1)
          )
       ORDER BY u.xp DESC, u.created_at ASC
       LIMIT $2`,
      [req.session!.uid, limit]
    );
    rows = r.rows;
  } else {
    const r = await query<LbRow>(
      `SELECT id, username, level, xp, equipped
       FROM users ORDER BY xp DESC, created_at ASC LIMIT $1`,
      [limit]
    );
    rows = r.rows;
  }
  const entries = rows.map((row, idx) => ({
    rank: idx + 1,
    id: row.id,
    username: row.username,
    level: row.level,
    xp: row.xp,
    banner: row.equipped?.banner
      ? itemsById[row.equipped.banner]?.bannerColor ?? null
      : null,
  }));
  res.json({ entries });
});

profileRouter.get("/:username", async (req, res) => {
  const r = await query<{
    id: string;
    username: string;
    level: number;
    xp: number;
    equipped: Record<string, string>;
    created_at: string;
  }>(
    `SELECT id, username, level, xp, equipped, created_at
     FROM users WHERE LOWER(username) = LOWER($1)`,
    [req.params.username]
  );
  if (!r.rowCount) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const u = r.rows[0];
  const equipped: Record<string, any> = {};
  for (const [slot, itemId] of Object.entries(u.equipped ?? {})) {
    const item = itemsById[itemId];
    if (item) equipped[slot] = item;
  }
  res.json({
    user: {
      id: u.id,
      username: u.username,
      level: u.level,
      xp: u.xp,
      memberSince: u.created_at,
      equipped,
      banner: equipped.banner?.bannerColor ?? null,
    },
  });
});
