import type { ItemDef } from "@dungeons/shared";
import { rarityClass, rarityLabel, slotLabel } from "../lib/rarity";

export function ItemCard({
  item,
  action,
  subtitle,
}: {
  item: ItemDef;
  action?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  const rc = rarityClass[item.rarity];
  return (
    <div
      className={`card border-l-4 ${rc} flex flex-col gap-2`}
      style={item.bannerColor ? { boxShadow: `inset 4px 0 0 ${item.bannerColor}` } : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold leading-tight">{item.name}</div>
          <div className="text-xs text-slate-400">
            {slotLabel[item.slot]} ·{" "}
            <span className={rc.split(" ")[1]}>{rarityLabel[item.rarity]}</span>
          </div>
        </div>
        {item.bannerColor && (
          <div
            className="w-6 h-6 rounded border border-slate-700"
            style={{ background: item.bannerColor }}
          />
        )}
      </div>
      {subtitle && <div className="text-xs text-slate-300">{subtitle}</div>}
      <div className="text-xs text-slate-400">{item.description}</div>
      <ul className="text-xs text-slate-300 flex flex-wrap gap-x-3 gap-y-0.5">
        {item.stats.hp ? <li>+{item.stats.hp} HP</li> : null}
        {item.stats.damage ? <li>+{item.stats.damage} DMG</li> : null}
        {item.stats.defense ? <li>+{item.stats.defense} DEF</li> : null}
        {item.stats.moveSpeed
          ? <li>{item.stats.moveSpeed > 0 ? "+" : ""}{Math.round(item.stats.moveSpeed * 100)}% SPD</li>
          : null}
        {item.stats.critChance
          ? <li>+{Math.round(item.stats.critChance * 100)}% CRIT</li>
          : null}
        {item.stats.goldBonus
          ? <li>+{Math.round(item.stats.goldBonus * 100)}% GOLD</li>
          : null}
        {item.stats.xpBonus
          ? <li>+{Math.round(item.stats.xpBonus * 100)}% XP</li>
          : null}
        {item.stats.lifesteal
          ? <li>+{Math.round(item.stats.lifesteal * 100)}% LIFESTEAL</li>
          : null}
      </ul>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
