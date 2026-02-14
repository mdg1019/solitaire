import type { Suit } from "./types";

export const suitFileMap: Record<Suit, string> = {
  hearts: "heart",
  diamonds: "diamond",
  clubs: "club",
  spades: "spade",
};

export function cardAssetUrl(fileName: string) {
  return new URL(`../assets/playing_cards/${fileName}`, import.meta.url).href;
}

export const backUrl = cardAssetUrl("back.png");

export const suitIcons: Record<Suit, string> = {
  hearts: cardAssetUrl("heart.svg"),
  diamonds: cardAssetUrl("diamond.svg"),
  clubs: cardAssetUrl("club.svg"),
  spades: cardAssetUrl("spade.svg"),
};

export const suitOrder: Suit[] = ["hearts", "clubs", "diamonds", "spades"];
