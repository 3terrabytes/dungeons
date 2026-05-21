import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { generateMap, findNode, isReachable } from "./map.js";
import { DUNGEONS, DEFAULT_DUNGEON_ID } from "@dungeons/shared/content/dungeons";
import type { DungeonMap } from "@dungeons/shared";

export const runRouter = Router();

interface RunRow {
  id: string;
  dungeon_id: string;
  current_node_id: string;
  map: DungeonMap;
  visited: string[];
  status: string;
}

async function getActiveRun(userId: string): Promise<RunRow | null> {
  const r = await query<RunRow>(
    `SELECT id, dungeon_id, current_node_id, map, visited, status
     FROM runs WHERE user_id = $1 AND status = 'active'
     ORDER BY started_at DESC LIMIT 1`,
    [userId]
  );
  return r.rows[0] ?? null;
}

runRouter.get("/current", async (req, res) => {
  const run = await getActiveRun(req.session!.uid);
  if (!run) {
    res.json({ run: null });
    return;
  }
  res.json({ run });
});

runRouter.post("/start", async (req, res) => {
  const existing = await getActiveRun(req.session!.uid);
  if (existing) {
    res.json({ run: existing });
    return;
  }
  const dungeon = DUNGEONS[DEFAULT_DUNGEON_ID];
  const seed = Math.floor(Math.random() * 2_000_000_000);
  const map = generateMap(dungeon, seed);
  const ins = await query<{ id: string }>(
    `INSERT INTO runs (user_id, dungeon_id, seed, current_node_id, visited, map)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      req.session!.uid,
      dungeon.id,
      seed,
      map.startNodeId,
      JSON.stringify([map.startNodeId]),
      JSON.stringify(map),
    ]
  );
  res.json({
    run: {
      id: ins.rows[0].id,
      dungeon_id: dungeon.id,
      current_node_id: map.startNodeId,
      map,
      visited: [map.startNodeId],
      status: "active",
    },
  });
});

const advanceSchema = z.object({ nodeId: z.string().min(1).max(64) });

runRouter.post("/advance", async (req, res) => {
  const parsed = advanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }
  const run = await getActiveRun(req.session!.uid);
  if (!run) {
    res.status(404).json({ error: "no_active_run" });
    return;
  }
  if (!isReachable(run.map, run.current_node_id, parsed.data.nodeId)) {
    res.status(400).json({ error: "unreachable" });
    return;
  }
  const node = findNode(run.map, parsed.data.nodeId);
  if (!node) {
    res.status(404).json({ error: "node_not_found" });
    return;
  }
  const visited = Array.from(new Set([...(run.visited ?? []), node.id]));
  await query(
    `UPDATE runs SET current_node_id = $1, visited = $2 WHERE id = $3`,
    [node.id, JSON.stringify(visited), run.id]
  );
  res.json({ node, visited });
});

runRouter.post("/abandon", async (req, res) => {
  await query(
    `UPDATE runs SET status = 'abandoned', ended_at = NOW()
     WHERE user_id = $1 AND status = 'active'`,
    [req.session!.uid]
  );
  res.json({ ok: true });
});
