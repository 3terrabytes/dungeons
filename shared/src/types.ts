export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type ItemSlot =
  | "weapon"
  | "offhand"
  | "armour"
  | "helmet"
  | "boots"
  | "ring"
  | "amulet"
  | "banner";

export interface ItemStats {
  hp?: number;
  damage?: number;
  defense?: number;
  moveSpeed?: number;
  critChance?: number;
  goldBonus?: number;
  lifesteal?: number;
  xpBonus?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  basePrice: number;
  stats: ItemStats;
  moveId?: string;
  bannerColor?: string;
  description: string;
}

export interface MoveDef {
  id: string;
  name: string;
  baseDamage: number;
  cooldownMs: number;
  projectileSpeed: number;
  range: number;
  description: string;
}

export type EnemyAI = "chaser" | "kiter" | "charger" | "summoner";

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  attackCooldownMs: number;
  attackRange: number;
  xpReward: number;
  goldReward: number;
  ai: EnemyAI;
  floor: number;
  color: string;
  radius: number;
}

export type NodeType = "enemy" | "elite" | "shop" | "treasure" | "rest" | "boss" | "start";

export interface MapNode {
  id: string;
  floor: number;
  column: number;
  type: NodeType;
  enemyId?: string;
  next: string[];
}

export interface DungeonMap {
  nodes: MapNode[];
  startNodeId: string;
}

export interface DungeonDef {
  id: string;
  name: string;
  floors: number;
  columnsMin: number;
  columnsMax: number;
  nodeWeights: Record<Exclude<NodeType, "start" | "boss">, number>;
  enemyPoolByFloor: Record<number, string[]>;
  elitePoolByFloor: Record<number, string[]>;
  bossId: string;
}

export interface PublicUser {
  id: string;
  username: string;
  level: number;
  xp: number;
  gold: number;
  bannerItemId: string | null;
  equipped: Partial<Record<ItemSlot, string>>;
}

export interface InventoryItem {
  userItemId: string;
  itemId: string;
}

export interface FightStartResponse {
  fightId: string;
  enemy: EnemyDef;
  playerMaxHp: number;
  playerMaxDps: number;
  playerSpeed: number;
  weaponMove: MoveDef | null;
}

export interface FightFinishRequest {
  fightId: string;
  result: "win" | "lose";
  elapsedMs: number;
  remainingPlayerHp: number;
}

export interface FightFinishResponse {
  granted: { xp: number; gold: number; loot: ItemDef | null };
  user: PublicUser;
}
