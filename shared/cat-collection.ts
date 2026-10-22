export const RARITIES = [
  "Basic",
  "Common",
  "Common",
  "Rare",
  "Rare",
  "Epic",
  "Epic",
  "Legendary",
] as const;
export const CAT_PRICES = [60, 90, 90, 160, 160, 260, 260, 500] as const;
export const CAT_BONUSES = [0, 1, 1, 3, 3, 5, 5, 8] as const;
export const slotCost = (slots: number) => slots * 50;
export const slotLimit = (level: number) =>
  level >= 3 ? 10 : level >= 2 ? 6 : 3;
export const activeCatBonus = (cats: { coat: number; happiness: number }[]) =>
  Math.min(
    20,
    cats.reduce(
      (total, cat) =>
        total + (cat.happiness >= 60 ? (CAT_BONUSES[cat.coat] ?? 0) : 0),
      0,
    ),
  );
