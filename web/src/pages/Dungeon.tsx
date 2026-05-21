import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { DungeonMap, MapNode, NodeType } from "@dungeons/shared";

interface ActiveRun {
  id: string;
  dungeon_id: string;
  current_node_id: string;
  map: DungeonMap;
  visited: string[];
  status: string;
}

const TYPE_LABEL: Record<NodeType, string> = {
  start: "Start",
  enemy: "Enemy",
  elite: "Elite",
  shop: "Shop",
  treasure: "Treasure",
  rest: "Rest",
  boss: "Boss",
};

const TYPE_COLOR: Record<NodeType, string> = {
  start: "#64748b",
  enemy: "#ef4444",
  elite: "#f97316",
  shop: "#22c55e",
  treasure: "#eab308",
  rest: "#0ea5e9",
  boss: "#a855f7",
};

export function Dungeon() {
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function refresh() {
    const { run } = await api.get<{ run: ActiveRun | null }>("/api/run/current");
    setRun(run);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function startRun() {
    setBusy(true);
    try {
      const { run } = await api.post<{ run: ActiveRun }>("/api/run/start");
      setRun(run);
    } finally {
      setBusy(false);
    }
  }

  async function abandonRun() {
    if (!confirm("Abandon the current run?")) return;
    setBusy(true);
    try {
      await api.post("/api/run/abandon");
      setRun(null);
    } finally {
      setBusy(false);
    }
  }

  async function pickNode(node: MapNode) {
    if (!run) return;
    setBusy(true);
    try {
      const res = await api.post<{ node: MapNode; visited: string[] }>(
        "/api/run/advance",
        { nodeId: node.id }
      );
      const newRun = {
        ...run,
        current_node_id: res.node.id,
        visited: res.visited,
      };
      setRun(newRun);
      if (res.node.type === "enemy" || res.node.type === "elite" || res.node.type === "boss") {
        navigate(`/combat/${res.node.id}`);
      } else if (res.node.type === "shop") {
        navigate("/shop");
      } else if (res.node.type === "treasure") {
        alert("You find a small treasure cache. (Treasure rewards coming soon.)");
      } else if (res.node.type === "rest") {
        alert("You rest. (Healing coming soon — for now combat starts at full HP.)");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;

  if (!run) {
    return (
      <div className="card max-w-md">
        <h1 className="text-xl font-semibold">The Catacombs await</h1>
        <p className="text-slate-400 text-sm mt-1">
          Choose your path through five floors of monsters, shops, and rest. A boss waits at the top.
        </p>
        <button className="btn-primary mt-4" onClick={startRun} disabled={busy}>
          {busy ? "Generating…" : "Enter Dungeon"}
        </button>
      </div>
    );
  }

  return <DungeonMapView run={run} busy={busy} onPick={pickNode} onAbandon={abandonRun} />;
}

function DungeonMapView({
  run,
  busy,
  onPick,
  onAbandon,
}: {
  run: ActiveRun;
  busy: boolean;
  onPick: (n: MapNode) => void;
  onAbandon: () => void;
}) {
  const { width, height, positions, edges } = useMemo(
    () => layoutMap(run.map),
    [run.map]
  );
  const current = run.map.nodes.find((n) => n.id === run.current_node_id)!;
  const reachable = new Set(current.next);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">The Catacombs</h1>
          <p className="text-xs text-slate-400">
            Click a glowing node above your current position to advance.
          </p>
        </div>
        <button className="btn-danger" onClick={onAbandon} disabled={busy}>
          Abandon Run
        </button>
      </div>
      <div className="card overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
        >
          {edges.map((e, i) => {
            const isCurrentEdge = e.from === run.current_node_id;
            return (
              <line
                key={i}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={isCurrentEdge ? "#3b82f6" : "#334155"}
                strokeWidth={isCurrentEdge ? 2.5 : 1.5}
              />
            );
          })}
          {run.map.nodes.map((node) => {
            const p = positions[node.id];
            const visited = run.visited.includes(node.id);
            const isCurrent = node.id === run.current_node_id;
            const canPick = reachable.has(node.id);
            const color = TYPE_COLOR[node.type];
            return (
              <g
                key={node.id}
                transform={`translate(${p.x}, ${p.y})`}
                style={{ cursor: canPick && !busy ? "pointer" : "default" }}
                onClick={() => canPick && !busy && onPick(node)}
              >
                <circle
                  r={isCurrent ? 18 : 14}
                  fill={
                    isCurrent
                      ? color
                      : visited
                      ? "#1e293b"
                      : canPick
                      ? color
                      : "#0f172a"
                  }
                  stroke={canPick || isCurrent ? color : "#334155"}
                  strokeWidth={canPick || isCurrent ? 3 : 1.5}
                  opacity={visited && !isCurrent ? 0.5 : 1}
                />
                <text
                  textAnchor="middle"
                  dy={32}
                  fontSize={10}
                  fill="#94a3b8"
                  className="select-none"
                >
                  {TYPE_LABEL[node.type]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
        {(Object.keys(TYPE_LABEL) as NodeType[]).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: TYPE_COLOR[k] }}
            />
            <span className="text-slate-400">{TYPE_LABEL[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function layoutMap(map: DungeonMap): {
  width: number;
  height: number;
  positions: Record<string, { x: number; y: number }>;
  edges: { from: string; x1: number; y1: number; x2: number; y2: number }[];
} {
  const byFloor: Record<number, typeof map.nodes> = {};
  for (const n of map.nodes) {
    byFloor[n.floor] = byFloor[n.floor] ?? [];
    byFloor[n.floor].push(n);
  }
  const floors = Object.keys(byFloor)
    .map(Number)
    .sort((a, b) => a - b);
  const maxCols = Math.max(...floors.map((f) => byFloor[f].length));
  const colW = 110;
  const rowH = 80;
  const padX = 60;
  const padY = 40;
  const width = padX * 2 + Math.max(1, maxCols - 1) * colW;
  const height = padY * 2 + (floors.length - 1) * rowH;
  const positions: Record<string, { x: number; y: number }> = {};
  for (const f of floors) {
    const nodes = byFloor[f].sort((a, b) => a.column - b.column);
    const n = nodes.length;
    const startX = width / 2 - ((n - 1) * colW) / 2;
    nodes.forEach((node, idx) => {
      positions[node.id] = {
        x: startX + idx * colW,
        y: height - padY - f * rowH,
      };
    });
  }
  const edges: { from: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const node of map.nodes) {
    for (const next of node.next) {
      const a = positions[node.id];
      const b = positions[next];
      if (!a || !b) continue;
      edges.push({ from: node.id, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
  return { width, height, positions, edges };
}
