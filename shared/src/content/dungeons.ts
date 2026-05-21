import type { DungeonDef } from "../types.js";

export const DUNGEONS: Record<string, DungeonDef> = {
  catacombs: {
    id: "catacombs",
    name: "The Catacombs",
    floors: 5,
    columnsMin: 3,
    columnsMax: 5,
    nodeWeights: {
      enemy: 60,
      elite: 12,
      shop: 10,
      treasure: 10,
      rest: 8,
    },
    enemyPoolByFloor: {
      1: ["slime", "rat", "bat"],
      2: ["skeleton", "goblin_archer", "spider"],
      3: ["zombie", "ghoul", "mage_acolyte"],
      4: ["wraith", "knight_fallen", "minotaur"],
      5: ["lich", "demon_brute"],
    },
    elitePoolByFloor: {
      1: ["skeleton"],
      2: ["spider", "zombie"],
      3: ["wraith", "knight_fallen"],
      4: ["minotaur", "lich"],
      5: ["demon_brute"],
    },
    bossId: "dungeon_lord",
  },
};

export const DEFAULT_DUNGEON_ID = "catacombs";
