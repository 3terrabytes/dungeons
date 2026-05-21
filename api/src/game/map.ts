import type { DungeonDef, DungeonMap, MapNode, NodeType } from "@dungeons/shared";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T extends string>(rng: () => number, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

export function generateMap(dungeon: DungeonDef, seed: number): DungeonMap {
  const rng = mulberry32(seed);
  const nodes: MapNode[] = [];

  const startId = "start";
  nodes.push({ id: startId, floor: 0, column: 0, type: "start", next: [] });

  const floorNodes: string[][] = [[startId]];

  for (let floor = 1; floor <= dungeon.floors; floor++) {
    const isBossFloor = floor === dungeon.floors;
    if (isBossFloor) {
      const id = `f${floor}_boss`;
      nodes.push({
        id,
        floor,
        column: 0,
        type: "boss",
        enemyId: dungeon.bossId,
        next: [],
      });
      floorNodes.push([id]);
      continue;
    }
    const cols =
      dungeon.columnsMin +
      Math.floor(rng() * (dungeon.columnsMax - dungeon.columnsMin + 1));
    const ids: string[] = [];
    for (let c = 0; c < cols; c++) {
      const type = weightedPick(rng, dungeon.nodeWeights as Record<NodeType, number>);
      const id = `f${floor}_c${c}`;
      let enemyId: string | undefined;
      if (type === "enemy") {
        enemyId = pick(rng, dungeon.enemyPoolByFloor[floor] ?? ["slime"]);
      } else if (type === "elite") {
        enemyId = pick(rng, dungeon.elitePoolByFloor[floor] ?? ["skeleton"]);
      }
      nodes.push({ id, floor, column: c, type, enemyId, next: [] });
      ids.push(id);
    }
    floorNodes.push(ids);
  }

  for (let f = 0; f < floorNodes.length - 1; f++) {
    const cur = floorNodes[f];
    const nxt = floorNodes[f + 1];
    for (const fromId of cur) {
      const fromNode = nodes.find((n) => n.id === fromId)!;
      const fromCol = fromNode.column;
      const candidates = nxt
        .map((id) => nodes.find((n) => n.id === id)!)
        .filter((n) => {
          if (nxt.length === 1) return true;
          return Math.abs(n.column - fromCol) <= 1;
        });
      if (candidates.length === 0) {
        fromNode.next = [...nxt];
      } else {
        const connections = 1 + Math.floor(rng() * Math.min(2, candidates.length));
        const shuffled = [...candidates].sort(() => rng() - 0.5);
        fromNode.next = shuffled.slice(0, connections).map((n) => n.id);
      }
    }
    for (const target of nxt) {
      const reachable = cur.some((id) => nodes.find((n) => n.id === id)!.next.includes(target));
      if (!reachable) {
        const fromNode = nodes.find((n) => n.id === cur[Math.floor(rng() * cur.length)])!;
        fromNode.next.push(target);
      }
    }
  }

  return { nodes, startNodeId: startId };
}

export function findNode(map: DungeonMap, id: string): MapNode | null {
  return map.nodes.find((n) => n.id === id) ?? null;
}

export function isReachable(map: DungeonMap, fromId: string, toId: string): boolean {
  const from = findNode(map, fromId);
  return !!from && from.next.includes(toId);
}
