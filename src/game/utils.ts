import type { Card } from "./types";
import { cardAssetUrl, suitFileMap } from "./constants";

export function cardImage(card: Card) {
  const suit = suitFileMap[card.suit];
  return cardAssetUrl(`${suit}_${card.rank}.svg`);
}
