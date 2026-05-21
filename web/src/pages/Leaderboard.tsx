import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useSession } from "../lib/store";

interface LbEntry {
  rank: number;
  id: string;
  username: string;
  level: number;
  xp: number;
  banner: string | null;
}

export function Leaderboard() {
  const [scope, setScope] = useState<"global" | "friends">("global");
  const [entries, setEntries] = useState<LbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const me = useSession((s) => s.user);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ entries: LbEntry[] }>(`/api/leaderboard?scope=${scope}`)
      .then(({ entries }) => setEntries(entries))
      .finally(() => setLoading(false));
  }, [scope]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Leaderboard</h1>
        <div className="flex bg-slate-900 border border-slate-700 rounded">
          {(["global", "friends"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 text-sm capitalize ${
                scope === s ? "bg-blue-600 text-white" : "text-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-slate-400">
          {scope === "friends"
            ? "No friends yet. Add some on the Friends tab to populate this list."
            : "Nobody has logged in yet."}
        </div>
      ) : (
        <div className="card divide-y divide-slate-800 p-0 overflow-hidden">
          {entries.map((e) => {
            const mine = me?.id === e.id;
            return (
              <Link
                to={`/profile/${e.username}`}
                key={e.id}
                className={`flex items-center gap-3 px-4 py-2 ${
                  mine ? "bg-blue-950/40" : "hover:bg-slate-800/60"
                }`}
              >
                <span className="w-8 text-slate-500 text-sm tabular-nums">
                  {e.rank}
                </span>
                {e.banner && (
                  <span
                    className="w-2 h-6 rounded-sm"
                    style={{ background: e.banner }}
                  />
                )}
                <span className="font-medium flex-1">{e.username}</span>
                <span className="text-xs text-slate-400">Lv {e.level}</span>
                <span className="text-sm tabular-nums">{e.xp.toLocaleString()} XP</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
