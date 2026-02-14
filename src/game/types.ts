export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type Card = {
  id: number;
  suit: Suit;
  rank: number;
};

export type TableauCard = {
  card: Card;
  face_up: boolean;
};

export type GameState = {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: TableauCard[][];
  draw_count: number;
};

export type Selection =
  | { kind: "waste" }
  | { kind: "foundation"; index: number }
  | { kind: "tableau"; index: number; cardIndex: number };
