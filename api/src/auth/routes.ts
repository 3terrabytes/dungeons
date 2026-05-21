import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { query } from "../db/pool.js";
import { clearSession, issueSession, requireAuth } from "./session.js";
import { STARTING_ITEMS } from "@dungeons/shared/content/items";
import { loadPublicUser } from "../game/user.js";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email().max(254),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscore only"),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const { email, username, password } = parsed.data;
  const emailLc = email.toLowerCase();
  const dup = await query<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(username) = LOWER($2)`,
    [emailLc, username]
  );
  if (dup.rowCount && dup.rowCount > 0) {
    res.status(409).json({ error: "email_or_username_taken" });
    return;
  }
  const password_hash = await bcrypt.hash(password, 12);
  const inserted = await query<{ id: string }>(
    `INSERT INTO users (email, username, password_hash, equipped)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [
      emailLc,
      username,
      password_hash,
      JSON.stringify({
        weapon: "wpn_rusty_sword",
        armour: "arm_cloth",
        boots: "bts_sandals",
        banner: "ban_blue",
      }),
    ]
  );
  const userId = inserted.rows[0].id;
  for (const itemId of STARTING_ITEMS) {
    await query(`INSERT INTO user_items (user_id, item_id) VALUES ($1, $2)`, [
      userId,
      itemId,
    ]);
  }
  await issueSession(res, { uid: userId, username });
  const user = await loadPublicUser(userId);
  res.json({ user });
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const emailLc = parsed.data.email.toLowerCase();
  const row = await query<{ id: string; username: string; password_hash: string }>(
    `SELECT id, username, password_hash FROM users WHERE LOWER(email) = $1`,
    [emailLc]
  );
  if (!row.rowCount) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  const u = row.rows[0];
  const ok = await bcrypt.compare(parsed.data.password, u.password_hash);
  if (!ok) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  await issueSession(res, { uid: u.id, username: u.username });
  const user = await loadPublicUser(u.id);
  res.json({ user });
});

authRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await loadPublicUser(req.session!.uid);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({ user });
});
