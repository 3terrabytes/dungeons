import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { createFight, step, FightState } from "../combat/engine";
import { render } from "../combat/renderer";
import { useSession } from "../lib/store";
import type {
  EnemyDef,
  ItemDef,
  MoveDef,
  PublicUser,
} from "@dungeons/shared";

interface StartResponse {
  fightId: string;
  enemy: EnemyDef;
  playerMaxHp: number;
  playerMaxDps: number;
  playerSpeed: number;
  weaponMove: MoveDef | null;
  nodeType: string;
}

interface FinishResponse {
  granted: { xp: number; gold: number; loot: ItemDef | null };
  user: PublicUser;
}

const ARENA_W = 800;
const ARENA_H = 500;

export function Combat() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const setUser = useSession((s) => s.setUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<FightState | null>(null);
  const [startInfo, setStartInfo] = useState<StartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<FinishResponse | "lose" | null>(null);
  const finishingRef = useRef(false);

  // Boot the fight
  useEffect(() => {
    if (!nodeId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<StartResponse>("/api/fight/start", { nodeId });
        if (cancelled) return;
        setStartInfo(res);
        stateRef.current = createFight(
          {
            arenaW: ARENA_W,
            arenaH: ARENA_H,
            playerMaxHp: res.playerMaxHp,
            playerSpeed: res.playerSpeed,
            weaponMove: res.weaponMove,
            enemy: res.enemy,
          },
          performance.now()
        );
      } catch (e) {
        setError(e instanceof ApiError ? e.body?.error ?? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  // Input
  useEffect(() => {
    function onKey(e: KeyboardEvent, down: boolean) {
      const s = stateRef.current;
      if (!s) return;
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          s.inputs.up = down;
          break;
        case "s":
        case "arrowdown":
          s.inputs.down = down;
          break;
        case "a":
        case "arrowleft":
          s.inputs.left = down;
          break;
        case "d":
        case "arrowright":
          s.inputs.right = down;
          break;
      }
    }
    function down(e: KeyboardEvent) {
      onKey(e, true);
    }
    function up(e: KeyboardEvent) {
      onKey(e, false);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Mouse
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onMove(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = ARENA_W / rect.width;
      const sy = ARENA_H / rect.height;
      s.player.aimX = (e.clientX - rect.left) * sx;
      s.player.aimY = (e.clientY - rect.top) * sy;
    }
    function onDown(e: MouseEvent) {
      const s = stateRef.current;
      if (!s) return;
      if (e.button === 0) s.inputs.fire = true;
    }
    function onUp(e: MouseEvent) {
      const s = stateRef.current;
      if (!s) return;
      if (e.button === 0) s.inputs.fire = false;
    }
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [startInfo]);

  // Game loop
  useEffect(() => {
    if (!startInfo) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const s = stateRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (s && ctx) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        step(s, dt, now);
        render(ctx, s);
        if (s.status !== "active" && !finishingRef.current) {
          finishingRef.current = true;
          finishFight(s);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [startInfo]);

  async function finishFight(s: FightState) {
    if (!startInfo) return;
    try {
      const res = await api.post<FinishResponse>("/api/fight/finish", {
        fightId: startInfo.fightId,
        result: s.status,
        elapsedMs: Math.round(s.elapsedMs),
        remainingPlayerHp: Math.max(0, Math.round(s.player.hp)),
      });
      if (s.status === "win") {
        setUser(res.user);
        setOutcome(res);
      } else {
        setOutcome("lose");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.body?.error ?? e.message : String(e));
    }
  }

  if (error) {
    return (
      <div className="card max-w-md">
        <div className="text-red-400 font-semibold">Combat error</div>
        <div className="text-sm text-slate-400 mt-1">{error}</div>
        <button className="btn mt-3" onClick={() => navigate("/dungeon")}>
          Back to map
        </button>
      </div>
    );
  }

  if (!startInfo) return <div className="text-slate-400">Entering combat…</div>;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">
          Fighting: <span className="text-red-400">{startInfo.enemy.name}</span>
        </h1>
        <div className="text-xs text-slate-400">
          WASD to move · Mouse to aim · Left-click to attack
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={ARENA_W}
        height={ARENA_H}
        className="rounded-lg border border-slate-800 w-full max-w-[800px] block bg-slate-950"
        style={{ aspectRatio: `${ARENA_W} / ${ARENA_H}`, height: "auto" }}
        tabIndex={0}
      />
      {outcome && (
        <Outcome
          outcome={outcome}
          onContinue={() => navigate("/dungeon")}
        />
      )}
    </div>
  );
}

function Outcome({
  outcome,
  onContinue,
}: {
  outcome: FinishResponse | "lose";
  onContinue: () => void;
}) {
  if (outcome === "lose") {
    return (
      <div className="mt-4 card border-red-700">
        <div className="text-red-400 font-semibold">Defeated</div>
        <p className="text-sm text-slate-400 mt-1">
          You fell in the catacombs. The run continues — try the next path.
        </p>
        <button className="btn mt-3" onClick={onContinue}>
          Return to map
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 card border-emerald-700">
      <div className="text-emerald-400 font-semibold">Victory</div>
      <div className="text-sm text-slate-300 mt-1 flex gap-4 flex-wrap">
        <span>+{outcome.granted.xp} XP</span>
        <span className="text-amber-400">+{outcome.granted.gold}g</span>
        {outcome.granted.loot && (
          <span>
            Loot: <span className="font-semibold">{outcome.granted.loot.name}</span>
          </span>
        )}
      </div>
      <button className="btn-primary mt-3" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
