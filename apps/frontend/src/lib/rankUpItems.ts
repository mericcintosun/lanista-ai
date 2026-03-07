/**
 * Rank-up NFT item IDs and asset paths. Aligned with contract (RankUpLootNFT):
 * tokenId 1-5 = Iron, 6-10 = Bronze, 11-15 = Silver, 16-20 = Gold, 21-25 = Platinum, 26-30 = Diamond, 31-35 = Master.
 */
export const RANK_NAMES = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER'] as const;
export const ITEMS_PER_RANK = 5;
export const TOTAL_ITEM_IDS = 35;

const RANK_SLUGS: Record<string, string> = {
  IRON: 'iron',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  DIAMOND: 'diamond',
  MASTER: 'master',
};

export function tokenIdToRankAndSlot(tokenId: number): { rankName: string; slot: number } {
  if (tokenId < 1 || tokenId > TOTAL_ITEM_IDS) {
    return { rankName: 'IRON', slot: 1 };
  }
  const rankIndex = Math.floor((tokenId - 1) / ITEMS_PER_RANK);
  const rankName = RANK_NAMES[rankIndex] ?? 'IRON';
  const slot = (tokenId - 1) % ITEMS_PER_RANK + 1;
  return { rankName, slot };
}

/**
 * Image path under /assets/items/ (e.g. iron-item1.png). Place images in public/assets/items/.
 */
export function tokenIdToImagePath(tokenId: number): string {
  const { rankName, slot } = tokenIdToRankAndSlot(tokenId);
  const slug = RANK_SLUGS[rankName] ?? 'iron';
  return `/assets/items/${slug}-item${slot}.png`;
}

const TOKEN_DISPLAY_NAMES: Record<number, string> = {
  1: "Ember's Share", 2: 'Anvil Bread', 3: 'Dungeon Fruit', 4: 'Rusty Goblet', 5: 'Broken Shackle',
  6: 'Bronze Essence', 7: "Victor's Morsel", 8: 'Arena Salt', 9: 'Ember Medallion', 10: 'War Horn',
  11: 'Moon Shard', 12: 'Glacial Nectar', 13: 'Silver Thorn', 14: 'Fragment of Dawn', 15: "Sword's Drop",
  16: "Sun's Share", 17: 'Golden Honeycomb', 18: 'Seed of Glory', 19: 'Royal Essence', 20: 'Sip of Victory',
  21: 'Unfading Shrapnel', 22: 'Platinum Nectar', 23: 'Morsel of Immortality', 24: 'Polar Sip', 25: "Sovereign's Drop",
  26: 'Diamond Shard', 27: 'Unbreakable Amber', 28: 'Prism Feast', 29: 'Eternal Frost', 30: "Legend's Share",
  31: 'Wine of the Gods', 32: "Lanista's Boon", 33: 'Endless Feast', 34: "Champion's Eternity", 35: 'The Ultimate Share',
};

const TOKEN_DESCRIPTIONS: Record<number, string> = {
  1: "The share fallen from the arena's first feast. Earned with blood and sweat. Verified by Chainlink VRF.",
  2: "Kneaded with the fire of the first clashes. The rookie's first sustenance. Verified by Chainlink VRF.",
  3: "The only fruit grown in the dark depths. The first sweetness after blood and dust. Verified by Chainlink VRF.",
  4: "The goblet raised in honor of the first victory. Rusty iron holds the wine. Verified by Chainlink VRF.",
  5: "A piece torn from the opened arena gate. Keep it as proof of the beginning. Verified by Chainlink VRF.",
  6: "The first taste dripping from the hive of victory. Dense, heavy, and real. Verified by Chainlink VRF.",
  7: "The first taste of satisfaction in victory. Seized from rivals by force. Verified by Chainlink VRF.",
  8: "The salt of the first sweat spilled into the arena. It will flavor all future feasts. Verified by Chainlink VRF.",
  9: "A token forged in the heart of the arena. The warmth that follows the fight. Verified by Chainlink VRF.",
  10: "The first horn of victory sounded for you. Its echo makes the arena tremble. Verified by Chainlink VRF.",
  11: "A piece torn from the moon watching your ascension. Cold and ruthless. Verified by Chainlink VRF.",
  12: "The dew of the night just before the silver dawn. Sharp and clear. Verified by Chainlink VRF.",
  13: "The thorn that made you bleed but couldn't kill you. It is your pride now. Verified by Chainlink VRF.",
  14: "The last piece remaining after the bloody night. The dawn now breaks for you. Verified by Chainlink VRF.",
  15: "A single drop trickling from the steel that withstood the clash. Made of pure silver. Verified by Chainlink VRF.",
  16: "The share the sun reserved for itself from the champion's table. You no longer look from below. Verified by Chainlink VRF.",
  17: "A pure essence from the hive of champions. Flawless and eternal. Verified by Chainlink VRF.",
  18: "A sprout that only grows in the field of champions. Plant it back into the soil. Verified by Chainlink VRF.",
  19: "A nectar only those who wear the crown can taste. You have earned this blessing. Verified by Chainlink VRF.",
  20: "That deep sip taken from the goblet of glory. Golden and endless. Verified by Chainlink VRF.",
  21: "An ore that never tarnishes. The first token borne by the elites. Verified by Chainlink VRF.",
  22: "The drop trickling only from the vine that blooms at the very top. Rare and ice-cold. Verified by Chainlink VRF.",
  23: "It is said that a single bite grants a thousand years of memories. That memory is now yours. Verified by Chainlink VRF.",
  24: "A sip of light filtered from the star that guides you. Flawless and clear. Verified by Chainlink VRF.",
  25: "The last drop fallen from the table of sovereigns. You are now at that table too. Verified by Chainlink VRF.",
  26: "A crystal that traps every light that falls upon it. The share reserved for legends. Verified by Chainlink VRF.",
  27: "That unique essence which will never spoil. Sealed into the heart of the diamond. Verified by Chainlink VRF.",
  28: "A feast that divides light into thousands of colors. Taste the might of each color. Verified by Chainlink VRF.",
  29: "An ice that does not melt even in hellfire. The freezing breath of the diamond morning. Verified by Chainlink VRF.",
  30: "That final blessing offered only to those who become legends. You are the one who seized it. Verified by Chainlink VRF.",
  31: "A single drop trickled from the goblet of immortals. You are now at the same table with them. Verified by Chainlink VRF.",
  32: "A share fallen directly from the Lanista's own table. Even a mere speck is enough to prove your power. Verified by Chainlink VRF.",
  33: "That legendary feast which will never end. And you sit at the head of the table. Verified by Chainlink VRF.",
  34: "Not just surviving; the right to be remembered in the arena forever. The true legacy of the master. Verified by Chainlink VRF.",
  35: "That final piece that ends all the feast and blood. There is nothing beyond this. Verified by Chainlink VRF.",
};

export function tokenIdToName(tokenId: number): string {
  return TOKEN_DISPLAY_NAMES[tokenId] ?? (() => {
    const { rankName, slot } = tokenIdToRankAndSlot(tokenId);
    return `${rankName} Item ${slot}`;
  })();
}

export function tokenIdToDescription(tokenId: number): string {
  return TOKEN_DESCRIPTIONS[tokenId] ?? '';
}
