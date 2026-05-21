import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const result = await pool.query<{ username: string; created_at: string }>(
    'SELECT username, created_at FROM users WHERE id = $1',
    [req.userId],
  );
  if (result.rowCount === 0) { res.status(404).json({ error: 'User not found' }); return; }
  const row = result.rows[0]!;
  res.json({ username: row.username, createdAt: row.created_at });
});

export default router;
