import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/store";
import { ItemCard } from "../components/ItemCard";
import type { ItemDef, PublicUser } from "@dungeons/shared";

export function Shop() {
  const [items, setItems] = useState<ItemDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);

  async function load() {
    setLoading(true);
    try {
      const { items } = await api.get<{ items: ItemDef[] }>("/api/shop");
      setItems(items);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function buy(item: ItemDef) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post<{ user: PublicUser; purchased: ItemDef }>(
        "/api/shop/purchase",
        { itemId: item.id }
      );
      setUser(res.user);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setMsg(`Bought ${item.name}.`);
    } catch (e) {
      setMsg(e instanceof ApiError ? humanError(e.body?.error) : "Could not purchase.");
    } finally {
      setBusy(false);
    }
  }

  async function reroll() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post<{ items: ItemDef[]; user: PublicUser }>(
        "/api/shop/reroll"
      );
      setItems(res.items);
      setUser(res.user);
    } catch (e) {
      setMsg(e instanceof ApiError ? humanError(e.body?.error) : "Could not refresh.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-slate-400">Loading shop…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Shop</h1>
          <p className="text-xs text-slate-400">
            Six items rolled for you. Stock refreshes every 30 minutes — or pay 50g.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-semibold">{user?.gold ?? 0}g</span>
          <button className="btn" onClick={reroll} disabled={busy}>
            Reroll (50g)
          </button>
        </div>
      </div>
      {msg && <div className="text-sm text-slate-300 mb-3">{msg}</div>}
      {items.length === 0 ? (
        <div className="text-slate-400">Shelves bare. Try a reroll.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              subtitle={<span className="text-amber-400">{item.basePrice}g</span>}
              action={
                <button
                  className="btn-primary w-full"
                  disabled={busy || (user?.gold ?? 0) < item.basePrice}
                  onClick={() => buy(item)}
                >
                  {(user?.gold ?? 0) < item.basePrice ? "Not enough gold" : "Buy"}
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function humanError(code?: string): string {
  switch (code) {
    case "not_enough_gold":
      return "Not enough gold.";
    case "item_not_in_shop":
      return "That item is no longer in stock.";
    default:
      return code ? `Error: ${code}` : "Something went wrong.";
  }
}
