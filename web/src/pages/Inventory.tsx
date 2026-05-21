import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useSession } from "../lib/store";
import { ItemCard } from "../components/ItemCard";
import { slotLabel } from "../lib/rarity";
import type { ItemDef, ItemSlot, PublicUser } from "@dungeons/shared";

interface InvEntry {
  userItemId: string;
  item: ItemDef;
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

export function Inventory() {
  const [entries, setEntries] = useState<InvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ItemSlot>("weapon");
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<{ items: InvEntry[] }>("/api/inventory");
      setEntries(r.items);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => entries.filter((e) => e.item.slot === activeSlot),
    [entries, activeSlot]
  );

  const equippedItemId = user?.equipped?.[activeSlot] ?? null;

  async function equip(userItemId: string | null) {
    setBusy(true);
    try {
      const res = await api.post<{ user: PublicUser }>("/api/inventory/equip", {
        slot: activeSlot,
        userItemId,
      });
      setUser(res.user);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-slate-400">Loading inventory…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Inventory</h1>
      <p className="text-xs text-slate-400 mb-4">
        Equip one item per slot. Banner is purely cosmetic and shown on profile + leaderboard.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {SLOT_ORDER.map((s) => {
          const count = entries.filter((e) => e.item.slot === s).length;
          return (
            <button
              key={s}
              onClick={() => setActiveSlot(s)}
              className={`pill ${
                activeSlot === s
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "border-slate-700 text-slate-300"
              }`}
            >
              {slotLabel[s]} <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>
      {equippedItemId && (
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Equipped</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered
              .filter((e) => e.item.id === equippedItemId)
              .slice(0, 1)
              .map((entry) => (
                <ItemCard
                  key={entry.userItemId}
                  item={entry.item}
                  action={
                    <button
                      className="btn w-full"
                      disabled={busy}
                      onClick={() => equip(null)}
                    >
                      Unequip
                    </button>
                  }
                />
              ))}
          </div>
        </div>
      )}
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2 mt-4">
        Owned
      </div>
      {filtered.length === 0 ? (
        <div className="text-slate-400 text-sm">
          You don't own any items in this slot.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((entry) => {
            const isEquipped = entry.item.id === equippedItemId;
            return (
              <ItemCard
                key={entry.userItemId}
                item={entry.item}
                action={
                  <button
                    className={isEquipped ? "btn w-full" : "btn-primary w-full"}
                    disabled={busy}
                    onClick={() => equip(isEquipped ? null : entry.userItemId)}
                  >
                    {isEquipped ? "Equipped (Unequip)" : "Equip"}
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
