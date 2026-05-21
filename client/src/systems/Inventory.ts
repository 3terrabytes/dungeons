/**
 * Inventory holds equipped gear, consumables, and permanent boosts.
 * It exposes derived stats so the Player can recompute on equip/level-up.
 */

export type EquipSlot = 'weapon' | 'armor' | 'hat' | 'boots';
export type ItemType = EquipSlot | 'consumable' | 'boost';

export interface BaseItem {
  id: string;
  name: string;
  cost: number;
  type: ItemType;
  sprite?: string;          // texture key for equipment layer
  stats?: { atk?: number; def?: number; spd?: number; maxHp?: number };
  effect?: { heal?: number; maxHp?: number; atk?: number };
}

export const SHOP_ITEMS: BaseItem[] = [
  { id: 'potion',      name: 'Health Potion',   cost: 25,  type: 'consumable', effect: { heal: 50 } },
  { id: 'iron-sword',  name: 'Iron Sword',      cost: 100, type: 'weapon',     stats: { atk: 5 },     sprite: 'weapon-sword' },
  { id: 'oak-bow',     name: 'Oak Bow',         cost: 110, type: 'weapon',     stats: { atk: 4 },     sprite: 'weapon-bow' },
  { id: 'arcane-staff',name: 'Arcane Staff',    cost: 180, type: 'weapon',     stats: { atk: 8 },     sprite: 'weapon-staff' },
  { id: 'leather',     name: 'Leather Armor',   cost: 80,  type: 'armor',      stats: { def: 3 },     sprite: 'armor-leather' },
  { id: 'iron-armor',  name: 'Iron Armor',      cost: 200, type: 'armor',      stats: { def: 7 },     sprite: 'armor-iron' },
  { id: 'red-cap',     name: 'Red Cap',         cost: 60,  type: 'hat',        stats: { maxHp: 15 },  sprite: 'hat-cap' },
  { id: 'crown',       name: 'Crown of Greed',  cost: 250, type: 'hat',        stats: { maxHp: 25, atk: 2 }, sprite: 'hat-crown' },
  { id: 'swift-boots', name: 'Swift Boots',     cost: 120, type: 'boots',      stats: { spd: 40 },    sprite: 'boots-swift' },
  { id: 'heart-up',    name: 'Heart Container', cost: 200, type: 'boost',      effect: { maxHp: 20 } },
  { id: 'fang-up',     name: 'Fang Charm',      cost: 220, type: 'boost',      effect: { atk: 3 } },
];

const ITEM_BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]));

export const getItem = (id: string): BaseItem | undefined => ITEM_BY_ID.get(id);

export interface InventoryStateSnapshot {
  equipped: Partial<Record<EquipSlot, string>>;
  potions: number;
  permanent: { maxHpBonus: number; atkBonus: number };
}

export class Inventory {
  equipped: Partial<Record<EquipSlot, string>> = {};
  potions = 0;
  permanent = { maxHpBonus: 0, atkBonus: 0 };

  constructor(initial?: InventoryStateSnapshot) {
    if (initial) {
      this.equipped = { ...initial.equipped };
      this.potions = initial.potions;
      this.permanent = { ...initial.permanent };
    }
  }

  /** Returns true on success. False if item type is invalid. */
  acquire(item: BaseItem): boolean {
    switch (item.type) {
      case 'consumable':
        this.potions += 1;
        return true;
      case 'boost':
        if (item.effect?.maxHp) this.permanent.maxHpBonus += item.effect.maxHp;
        if (item.effect?.atk)   this.permanent.atkBonus   += item.effect.atk;
        return true;
      case 'weapon':
      case 'armor':
      case 'hat':
      case 'boots':
        this.equipped[item.type] = item.id;
        return true;
      default:
        return false;
    }
  }

  /** Consume one potion; returns the heal amount or 0 if none. */
  usePotion(): number {
    if (this.potions <= 0) return 0;
    this.potions -= 1;
    return getItem('potion')!.effect!.heal ?? 0;
  }

  /** Aggregate stat modifiers from equipped gear + permanent boosts. */
  modifiers(): { atk: number; def: number; spd: number; maxHp: number } {
    const m = { atk: this.permanent.atkBonus, def: 0, spd: 0, maxHp: this.permanent.maxHpBonus };
    (Object.values(this.equipped) as string[]).forEach((id) => {
      const it = getItem(id);
      if (!it?.stats) return;
      m.atk   += it.stats.atk   ?? 0;
      m.def   += it.stats.def   ?? 0;
      m.spd   += it.stats.spd   ?? 0;
      m.maxHp += it.stats.maxHp ?? 0;
    });
    return m;
  }

  snapshot(): InventoryStateSnapshot {
    return {
      equipped: { ...this.equipped },
      potions: this.potions,
      permanent: { ...this.permanent },
    };
  }
}
