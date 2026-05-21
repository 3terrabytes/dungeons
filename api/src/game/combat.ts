import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { query } from "../db/pool.js";
import { computeCombatStats, loadPublicUser, recomputeLevel } from "./user.js";
import { enemiesById } from "@dungeons/shared/content/enemies";
import { movesById } from "@dungeons/shared/content/moves";
import { rollLoot } from "./loot.js";

export const fightRouter = Router();

const finishLimiter = rateLimit({ windowMs: 60_000, limit: 60 });

const startSchema = z.object({ nodeId: z.string().min(1).max(64) });

fightRouter.post("/start", async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const userId = req.session!.uid;
  const runQ = await query<{
    id: string;
    map: { nodes: { id: string; enemyId?: string; type: string }[] };
    current_node_id: string;
  }>(
    `SELECT id, map, current_node_id FROM runs WHERE user_id = $1 AND status = 'active'
     ORDER BY started_at DESC LIMIT 1`,
    [userId]
  );
  if (!runQ.rowCount) {
    res.status(404).json({ error: "no_active_run" });
    return;
  }
  const run = runQ.rows[0];
  if (run.current_node_id !== parsed.data.nodeId) {
    res.status(400).json({ error: "node_not_current" });
    return;
  }
  const node = run.map.nodes.find((n) => n.id === parsed.data.nodeId);
  if (!node || !node.enemyId) {
    res.status(400).json({ error: "node_has_no_enemy" });
    return;
  }
  const enemy = enemiesById[node.enemyId];
  if (!enemy) {
    res.status(500).json({ error: "enemy_missing" });
    return;
  }
  const stats = await computeCombatStats(userId);
  const isElite = node.type === "elite" || node.type === "boss";
  const baseMove = stats.weaponMoveId ? movesById[stats.weaponMoveId] ?? null : null;
  const weaponMove = baseMove
    ? { ...baseMove, baseDamage: baseMove.baseDamage + stats.damageBonus }
    : null;
  const effectiveDps =
    weaponMove && weaponMove.cooldownMs > 0
      ? (weaponMove.baseDamage * (1 + stats.critChance * 0.5)) /
        (weaponMove.cooldownMs / 1000)
      : 0;
  const fightIns = await query<{ id: string }>(
    `INSERT INTO fights (run_id, user_id, enemy_id, node_id, player_max_dps, player_max_hp, enemy_hp, is_elite)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [run.id, userId, enemy.id, node.id, effectiveDps, stats.maxHp, enemy.hp, isElite]
  );
  res.json({
    fightId: fightIns.rows[0].id,
    enemy,
    playerMaxHp: stats.maxHp,
    playerMaxDps: effectiveDps,
    playerSpeed: stats.moveSpeed,
    weaponMove,
    nodeType: node.type,
  });
});

const finishSchema = z.object({
  fightId: z.string().uuid(),
  result: z.enum(["win", "lose"]),
  elapsedMs: z.number().int().min(0).max(10 * 60 * 1000),
  remainingPlayerHp: z.number().int().min(0).max(100_000),
});

fightRouter.post("/finish", finishLimiter, async (req, res) => {
  const parsed = finishSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const userId = req.session!.uid;
  const fightQ = await query<{
    id: string;
    enemy_id: string;
    player_max_dps: number;
    enemy_hp: number;
    is_elite: boolean;
    ended_at: string | null;
    started_at: string;
  }>(
    `SELECT id, enemy_id, player_max_dps, enemy_hp, is_elite, ended_at, started_at
     FROM fights WHERE id = $1 AND user_id = $2`,
    [parsed.data.fightId, userId]
  );
  if (!fightQ.rowCount) {
    res.status(404).json({ error: "fight_not_found" });
    return;
  }
  const fight = fightQ.rows[0];
  if (fight.ended_at) {
    res.status(400).json({ error: "fight_already_finished" });
    return;
  }
  const ageMs = Date.now() - new Date(fight.started_at).getTime();
  if (ageMs > 10 * 60 * 1000) {
    await query(`UPDATE fights SET ended_at = NOW(), result = 'expired' WHERE id = $1`, [fight.id]);
    res.status(400).json({ error: "fight_expired" });
    return;
  }
  if (parsed.data.result === "win") {
    const minSecondsToKill = fight.player_max_dps > 0
      ? fight.enemy_hp / fight.player_max_dps
      : Infinity;
    const minMsRequired = Math.max(800, minSecondsToKill * 1000 * 0.6);
    if (parsed.data.elapsedMs < minMsRequired) {
      await query(`UPDATE fights SET ended_at = NOW(), result = 'rejected' WHERE id = $1`, [fight.id]);
      res.status(400).json({ error: "implausible_result" });
      return;
    }
  }
  const enemy = enemiesById[fight.enemy_id];
  if (!enemy) {
    res.status(500).json({ error: "enemy_missing" });
    return;
  }
  let xp = 0, gold = 0;
  let loot = null;
  if (parsed.data.result === "win") {
    const multiplier = fight.is_elite ? 1.8 : 1;
    xp = Math.floor(enemy.xpReward * multiplier);
    gold = Math.floor(enemy.goldReward * multiplier);
    const stats = await computeCombatStats(userId);
    xp = Math.floor(xp * (1 + stats.xpBonus));
    gold = Math.floor(gold * (1 + stats.goldBonus));
    const lootRng = Math.random;
    const lootChance = fight.is_elite ? 0.65 : 0.25;
    if (lootRng() < lootChance) {
      loot = rollLoot(lootRng, fight.is_elite ? 1 : 0);
      if (loot) {
        await query(`INSERT INTO user_items (user_id, item_id) VALUES ($1, $2)`, [
          userId,
          loot.id,
        ]);
      }
    }
    await query(
      `UPDATE users SET xp = xp + $1, gold = gold + $2 WHERE id = $3`,
      [xp, gold, userId]
    );
  }
  await query(
    `UPDATE fights SET ended_at = NOW(), result = $1 WHERE id = $2`,
    [parsed.data.result, fight.id]
  );
  await recomputeLevel(userId);
  const user = await loadPublicUser(userId);
  res.json({ granted: { xp, gold, loot }, user });
});
