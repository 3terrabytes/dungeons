import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { signToken, cookieOptions } from '../middleware/auth.js';

const router = Router();
const isProd = process.env.NODE_ENV === 'production';

const limiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

const credSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(6).max(128),
});

router.post('/register', async (req, res) => {
  const parsed = credSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Username 3-32 (a-z, 0-9, _, -), password 6+ chars' }); return; }
  const { username, password } = parsed.data;

  const exists = await pool.query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  if (exists.rowCount && exists.rowCount > 0) { res.status(409).json({ error: 'Username taken' }); return; }

  const hash = await bcrypt.hash(password, 12);
  const insert = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
    [username, hash],
  );
  const userId = insert.rows[0].id as number;
  await pool.query('INSERT INTO saves (user_id, data) VALUES ($1, $2)', [userId, {}]);

  res.cookie('token', signToken(userId), cookieOptions(isProd));
  res.json({ username });
});

router.post('/login', async (req, res) => {
  const parsed = credSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid credentials' }); return; }
  const { username, password } = parsed.data;

  const result = await pool.query<{ id: number; password_hash: string }>(
    'SELECT id, password_hash FROM users WHERE LOWER(username) = LOWER($1)',
    [username],
  );
  if (result.rowCount === 0) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  const row = result.rows[0]!;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  res.cookie('token', signToken(row.id), cookieOptions(isProd));
  res.json({ username });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', cookieOptions(isProd));
  res.status(204).end();
});

export default router;
