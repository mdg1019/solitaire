import type { Card, GameState, Suit, TableauCard } from "./types";

type PileKind = "stock" | "waste" | "foundation" | "tableau";

type PileRef = {
  kind: PileKind;
  index?: number;
  card_index?: number;
};

type MoveRequest = {
  from: PileRef;
  to: PileRef;
};

const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

let state: GameState = newGameState();

function newGameState(): GameState {
  const deck: Card[] = [];
  let id = 0;
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ id, suit, rank });
      id += 1;
    }
  }

  shuffle(deck);

  const tableau: TableauCard[][] = [];
  for (let pileIndex = 0; pileIndex < 7; pileIndex += 1) {
    const pile: TableauCard[] = [];
    for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex += 1) {
      const card = deck.pop();
      if (!card) throw new Error("deck should have enough cards");
      pile.push({ card, face_up: cardIndex === pileIndex });
    }
    tableau.push(pile);
  }

  return {
    stock: deck,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    draw_count: 3,
  };
}

function shuffle<T>(list: T[]) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function cloneState(game: GameState): GameState {
  return JSON.parse(JSON.stringify(game)) as GameState;
}

function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

function isValidTableauRun(cards: TableauCard[]): boolean {
  if (!cards.length) return false;
  for (let i = 0; i < cards.length - 1; i += 1) {
    const current = cards[i].card;
    const next = cards[i + 1].card;
    if (current.rank !== next.rank + 1) return false;
    if (isRed(current.suit) === isRed(next.suit)) return false;
  }
  return true;
}

function canPlaceOnFoundation(pile: Card[], card: Card): boolean {
  const top = pile[pile.length - 1];
  if (top) {
    return top.suit === card.suit && card.rank === top.rank + 1;
  }
  return card.rank === 1;
}

function canPlaceOnTableau(pile: TableauCard[], movingCards: Card[]): boolean {
  const lead = movingCards[0];
  const top = pile[pile.length - 1];
  if (top) {
    if (!top.face_up) return false;
    return top.card.rank === lead.rank + 1 && isRed(top.card.suit) !== isRed(lead.suit);
  }
  return lead.rank === 13;
}

function flipTableauTops(game: GameState) {
  for (const pile of game.tableau) {
    const top = pile[pile.length - 1];
    if (top && !top.face_up) {
      top.face_up = true;
    }
  }
}

function removeFromSource(game: GameState, source: MoveSource) {
  if (source.kind === "waste") {
    game.waste.pop();
    return;
  }
  if (source.kind === "foundation") {
    game.foundations[source.index]?.pop();
    return;
  }
  if (source.kind === "tableau") {
    const pile = game.tableau[source.index];
    if (pile && source.cardIndex <= pile.length) {
      pile.length = source.cardIndex;
    }
  }
}

type MoveSource =
  | { kind: "waste" }
  | { kind: "foundation"; index: number }
  | { kind: "tableau"; index: number; cardIndex: number };

function applyMove(game: GameState, request: MoveRequest) {
  let movingCards: Card[] = [];
  let source: MoveSource | null = null;

  if (request.from.kind === "waste") {
    const card = game.waste[game.waste.length - 1];
    if (!card) throw new Error("Waste is empty");
    movingCards = [card];
    source = { kind: "waste" };
  } else if (request.from.kind === "foundation") {
    if (request.from.index === undefined) throw new Error("Foundation index required");
    const pile = game.foundations[request.from.index];
    if (!pile) throw new Error("Foundation index out of range");
    const card = pile[pile.length - 1];
    if (!card) throw new Error("Foundation is empty");
    movingCards = [card];
    source = { kind: "foundation", index: request.from.index };
  } else if (request.from.kind === "tableau") {
    if (request.from.index === undefined) throw new Error("Tableau index required");
    if (request.from.card_index === undefined) throw new Error("Tableau card index required");
    const pile = game.tableau[request.from.index];
    if (!pile) throw new Error("Tableau index out of range");
    if (request.from.card_index >= pile.length) {
      throw new Error("Tableau card index out of range");
    }
    const slice = pile.slice(request.from.card_index);
    if (slice.some((card) => !card.face_up)) {
      throw new Error("Cannot move face-down cards");
    }
    if (!isValidTableauRun(slice)) {
      throw new Error("Tableau run is invalid");
    }
    movingCards = slice.map((tc) => tc.card);
    source = {
      kind: "tableau",
      index: request.from.index,
      cardIndex: request.from.card_index,
    };
  } else {
    throw new Error("Use draw to move from stock");
  }

  if (
    request.from.kind === "tableau" &&
    request.to.kind === "tableau" &&
    request.from.index === request.to.index
  ) {
    throw new Error("Cannot move cards onto the same tableau pile");
  }

  if (request.to.kind === "foundation") {
    if (request.to.index === undefined) throw new Error("Foundation index required");
    const pile = game.foundations[request.to.index];
    if (!pile) throw new Error("Foundation index out of range");
    if (movingCards.length !== 1) throw new Error("Only one card can move to foundation");
    const card = movingCards[0];
    if (!canPlaceOnFoundation(pile, card)) {
      throw new Error("Card cannot be placed on foundation");
    }
    if (!source) throw new Error("No source for move");
    removeFromSource(game, source);
    pile.push(card);
  } else if (request.to.kind === "tableau") {
    if (request.to.index === undefined) throw new Error("Tableau index required");
    const pile = game.tableau[request.to.index];
    if (!pile) throw new Error("Tableau index out of range");
    if (!movingCards.length) throw new Error("No cards to move");
    if (!canPlaceOnTableau(pile, movingCards)) {
      throw new Error("Card cannot be placed on tableau");
    }
    if (!source) throw new Error("No source for move");
    removeFromSource(game, source);
    for (const card of movingCards) {
      pile.push({ card, face_up: true });
    }
  } else {
    throw new Error("Cannot move cards to that pile");
  }

  flipTableauTops(game);
}

function drawInternal(game: GameState) {
  if (!game.stock.length) {
    if (game.waste.length) {
      while (game.waste.length) {
        const card = game.waste.pop();
        if (card) game.stock.push(card);
      }
    }
    return;
  }

  const drawCount = Math.max(1, game.draw_count) as 1 | 3;
  for (let i = 0; i < drawCount; i += 1) {
    const card = game.stock.pop();
    if (card) {
      game.waste.push(card);
    } else {
      break;
    }
  }
}

export function newGame(): GameState {
  state = newGameState();
  return cloneState(state);
}

export function getState(): GameState {
  return cloneState(state);
}

export function draw(): GameState {
  drawInternal(state);
  return cloneState(state);
}

export function moveCards(request: MoveRequest): GameState {
  applyMove(state, request);
  return cloneState(state);
}

export function setDrawCount(drawCount: 1 | 3): GameState {
  if (drawCount !== 1 && drawCount !== 3) {
    throw new Error("Draw count must be 1 or 3");
  }
  state.draw_count = drawCount;
  return cloneState(state);
}
