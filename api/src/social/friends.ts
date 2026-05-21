import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { query } from "../db/pool.js";

export const friendsRouter = Router();

const requestLimiter = rateLimit({ windowMs: 60_000, limit: 10 });

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

friendsRouter.get("/", async (req, res) => {
  const uid = req.session!.uid;
  const r = await query<{
    id: string;
    user_a: string;
    user_b: string;
    requested_by: string;
    status: string;
    other_id: string;
    other_username: string;
    other_level: number;
  }>(
    `SELECT f.id, f.user_a, f.user_b, f.requested_by, f.status,
            CASE WHEN f.user_a = $1 THEN f.user_b ELSE f.user_a END AS other_id,
            u.username AS other_username,
            u.level AS other_level
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.user_a = $1 THEN f.user_b ELSE f.user_a END
     WHERE f.user_a = $1 OR f.user_b = $1
     ORDER BY f.created_at DESC`,
    [uid]
  );
  res.json({
    friends: r.rows.map((row) => ({
      id: row.id,
      status: row.status,
      direction:
        row.status === "pending"
          ? row.requested_by === uid
            ? "outgoing"
            : "incoming"
          : null,
      user: {
        id: row.other_id,
        username: row.other_username,
        level: row.other_level,
      },
    })),
  });
});

const searchSchema = z.object({ q: z.string().min(2).max(20) });

friendsRouter.get("/search", async (req, res) => {
  const parsed = searchSchema.safeParse({ q: req.query.q });
  if (!parsed.success) {
    res.json({ users: [] });
    return;
  }
  const r = await query<{ id: string; username: string; level: number }>(
    `SELECT id, username, level FROM users
     WHERE username ILIKE $1 AND id <> $2
     ORDER BY level DESC LIMIT 20`,
    [`%${parsed.data.q}%`, req.session!.uid]
  );
  res.json({ users: r.rows });
});

const requestSchema = z.object({ username: z.string().min(3).max(20) });

friendsRouter.post("/request", requestLimiter, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const uid = req.session!.uid;
  const target = await query<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
    [parsed.data.username]
  );
  if (!target.rowCount) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }
  const otherId = target.rows[0].id;
  if (otherId === uid) {
    res.status(400).json({ error: "cannot_befriend_self" });
    return;
  }
  const [a, b] = orderedPair(uid, otherId);
  try {
    await query(
      `INSERT INTO friendships (user_a, user_b, requested_by, status)
       VALUES ($1, $2, $3, 'pending')`,
      [a, b, uid]
    );
  } catch (e: any) {
    if (String(e.code) === "23505") {
      res.status(409).json({ error: "already_exists" });
      return;
    }
    throw e;
  }
  res.json({ ok: true });
});

const idSchema = z.object({ id: z.string().uuid() });

friendsRouter.post("/accept", async (req, res) => {
  const parsed = idSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const uid = req.session!.uid;
  const r = await query(
    `UPDATE friendships SET status = 'accepted'
     WHERE id = $1 AND status = 'pending' AND requested_by <> $2
       AND (user_a = $2 OR user_b = $2)`,
    [parsed.data.id, uid]
  );
  if (!r.rowCount) {
    res.status(404).json({ error: "not_found_or_not_yours" });
    return;
  }
  res.json({ ok: true });
});

friendsRouter.post("/decline", async (req, res) => {
  const parsed = idSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const uid = req.session!.uid;
  await query(
    `DELETE FROM friendships
     WHERE id = $1 AND (user_a = $2 OR user_b = $2)`,
    [parsed.data.id, uid]
  );
  res.json({ ok: true });
});
