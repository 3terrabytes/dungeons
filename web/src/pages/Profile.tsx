import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useSession } from "../lib/store";
import { ItemCard } from "../components/ItemCard";
import { slotLabel } from "../lib/rarity";
import type { ItemDef, ItemSlot } from "@dungeons/shared";

interface ProfileResp {
  user: {
    id: string;
    username: string;
    level: number;
    xp: number;
    memberSince: string;
    equipped: Partial<Record<ItemSlot, ItemDef>>;
    banner: string | null;
  };
}

const SLOT_ORDER: ItemSlot[] = [
  "weapon",
  "offhand",
  "armour",
  "helmet",
  "boots",
  "ring",
  "amulet",
  "banner",
];

export function Profile() {
  const { username: paramUsername } = useParams();
  const me = useSession((s) => s.user);
  const username = paramUsername || me?.username;
  const [data, setData] = useState<ProfileResp["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    api
      .get<ProfileResp>(`/api/profile/${encodeURIComponent(username)}`)
      .then((r) => setData(r.user))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (notFound || !data) {
    return <div className="text-slate-400">No such adventurer.</div>;
  }

  const isMe = me?.id === data.id;
  return (
    <div>
      <div
        className="card mb-4 flex items-center gap-4"
        style={data.banner ? { borderLeft: `6px solid ${data.banner}` } : undefined}
      >
        <div
          className="w-16 h-16 rounded-md border border-slate-700 flex items-center justify-center text-2xl font-bold"
          style={{ background: data.banner ?? "#1e293b" }}
        >
          {data.username[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-xl font-semibold">{data.username}</div>
          <div className="text-xs text-slate-400">
            Level {data.level} · {data.xp.toLocaleString()} XP · Member since{" "}
            {new Date(data.memberSince).toLocaleDateString()}
          </div>
        </div>
        {isMe && <span className="pill border-blue-500 text-blue-300">You</span>}
      </div>
      <h2 className="text-sm uppercase tracking-wide text-slate-400 mb-2">Loadout</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SLOT_ORDER.map((slot) => {
          const item = data.equipped[slot];
          if (!item) {
            return (
              <div
                key={slot}
                className="card border-dashed text-slate-500 text-sm"
              >
                <div className="text-xs uppercase">{slotLabel[slot]}</div>
                <div className="mt-1">— empty —</div>
              </div>
            );
          }
          return <ItemCard key={slot} item={item} />;
        })}
      </div>
    </div>
  );
}
