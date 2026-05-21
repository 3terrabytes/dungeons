import type { Rarity } from "@dungeons/shared";

export const rarityClass: Record<Rarity, string> = {
  common: "border-rarity-common text-rarity-common",
  uncommon: "border-rarity-uncommon text-rarity-uncommon",
  rare: "border-rarity-rare text-rarity-rare",
  epic: "border-rarity-epic text-rarity-epic",
  legendary: "border-rarity-legendary text-rarity-legendary",
};

export const rarityLabel: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const slotLabel: Record<string, string> = {
  weapon: "Weapon",
  offhand: "Off-hand",
  armour: "Armour",
  helmet: "Helmet",
  boots: "Boots",
  ring: "Ring",
  amulet: "Amulet",
  banner: "Banner",
};
