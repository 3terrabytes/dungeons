import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const router = Router();

const DEFAULT_SAVE = {
  highestFloor: 0,
  totalGold: 0,
  permanentBoosts: { maxHpBonus: 0, atkBonus: 0 },
  unlockedItems: [] as string[],
};

const saveSchema = z.object({
  highestFloor: z.number().int().min(0).max(1000),
  totalGold:    z.number().int().min(0).max(10_000_000),
  permanentBoosts: z.object({
    maxHpBonus: z.number().int().min(0).max(10_000),
    atkBonus:   z.number().int().min(0).max(10_000),
  }),
  unlockedItems: z.array(z.string().max(64)).max(200),
});

router.get('/save', requireAuth, async (req: AuthedRequest, res) => {
  const result = await pool.query<{ data: typeof DEFAULT_SAVE }>(
    'SELECT data FROM saves WHERE user_id = $1',
    [req.userId],
  );
  const row = result.rows[0];
  res.json({ ...DEFAULT_SAVE, ...(row?.data ?? {}) });
});

router.put('/save', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid save data' }); return; }
  await pool.query(
    `INSERT INTO saves (user_id, data, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [req.userId, parsed.data],
  );
  res.json(parsed.data);
});

export default router;
