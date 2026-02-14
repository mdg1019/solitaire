import { computed, onMounted, ref } from "vue";
import { suitOrder } from "./constants";
import type { Card, GameState, Selection } from "./types";
import { cardImage } from "./utils";
import {
  draw as drawBackend,
  moveCards as moveCardsBackend,
  newGame as newGameBackend,
  setDrawCount as setDrawCountBackend,
} from "./backend";

export function useGame() {
  const game = ref<GameState | null>(null);
  const selection = ref<Selection | null>(null);
  const message = ref("");
  const drawMode = ref<1 | 3>(3);
  const dragSource = ref<Selection | null>(null);
  const dragOverTarget = ref<string | null>(null);

  const topWaste = computed(() => {
    const waste = game.value?.waste;
    return waste && waste.length ? waste[waste.length - 1] : null;
  });

  const topFoundations = computed(() => {
    const foundations = game.value?.foundations;
    return foundations
      ? foundations.map((pile) => (pile.length ? pile[pile.length - 1] : null))
      : [];
  });

  async function newGame() {
    message.value = "";
    selection.value = null;
    game.value = newGameBackend();
    drawMode.value = (game.value?.draw_count as 1 | 3) ?? 3;
  }

  async function drawCard() {
    if (!game.value) return;
    message.value = "";
    selection.value = null;
    game.value = drawBackend();
  }

  function selectWaste() {
    if (!topWaste.value) return;
    selection.value = { kind: "waste" };
  }

  async function handleFoundationClick(index: number) {
    if (selection.value) {
      if (selection.value.kind === "foundation" && selection.value.index === index) {
        return;
      }
      await moveToFoundation(index);
      return;
    }
    const top = topFoundations.value[index];
    if (!top) return;
    selection.value = { kind: "foundation", index };
  }

  async function handleTableauCardClick(pileIndex: number, cardIndex: number) {
    const pile = game.value?.tableau[pileIndex];
    if (!pile) return;
    const card = pile[cardIndex];
    if (!card.face_up) return;
    if (selection.value) {
      if (
        selection.value.kind === "tableau" &&
        selection.value.index === pileIndex &&
        selection.value.cardIndex === cardIndex
      ) {
        return;
      }
      await moveToTableau(pileIndex);
      return;
    }
    selection.value = { kind: "tableau", index: pileIndex, cardIndex };
  }

  async function performMove(from: Selection, toKind: "foundation" | "tableau", toIndex: number) {
    if (!game.value) return;
    message.value = "";
    try {
      const fromRef = {
        kind: from.kind,
        index: "index" in from ? from.index : undefined,
        card_index: from.kind === "tableau" ? from.cardIndex : undefined,
      };
      game.value = moveCardsBackend({
        from: fromRef,
        to: { kind: toKind, index: toIndex },
      });
      selection.value = null;
    } catch (err) {
      message.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function moveToFoundation(index: number) {
    if (!selection.value) return;
    await performMove(selection.value, "foundation", index);
  }

  async function moveToTableau(index: number) {
    if (!selection.value) return;
    await performMove(selection.value, "tableau", index);
  }

  function onWasteDragStart(event: DragEvent) {
    if (!topWaste.value || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    dragSource.value = { kind: "waste" };
    selection.value = null;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "move");
    const img = (event.currentTarget as HTMLElement).querySelector("img.card");
    if (img) {
      event.dataTransfer.setDragImage(img, 55, 20);
    }
  }

  function onTableauDragStart(event: DragEvent, pileIndex: number, cardIndex: number) {
    const pile = game.value?.tableau[pileIndex];
    if (!pile || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    if (!pile[cardIndex].face_up) {
      event.preventDefault();
      return;
    }
    dragSource.value = { kind: "tableau", index: pileIndex, cardIndex };
    selection.value = null;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "move");

    const cards = pile.slice(cardIndex);
    const ghost = document.createElement("div");
    ghost.style.position = "absolute";
    ghost.style.top = "-9999px";
    ghost.style.left = "-9999px";
    ghost.style.width = "110px";
    ghost.style.height = `${(cards.length - 1) * 26 + 150}px`;
    cards.forEach((tc, i) => {
      const img = document.createElement("img");
      img.src = cardImage(tc.card);
      img.style.width = "110px";
      img.style.position = "absolute";
      img.style.top = `${i * 26}px`;
      img.style.left = "0";
      img.style.borderRadius = "12px";
      ghost.appendChild(img);
    });
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 55, 20);
    requestAnimationFrame(() => {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    });
  }

  async function onFoundationDrop(event: DragEvent, index: number) {
    event.preventDefault();
    dragOverTarget.value = null;
    if (!dragSource.value) return;
    await performMove(dragSource.value, "foundation", index);
    dragSource.value = null;
  }

  async function onTableauDrop(event: DragEvent, pileIndex: number) {
    event.preventDefault();
    dragOverTarget.value = null;
    if (!dragSource.value) return;
    if (dragSource.value.kind === "tableau" && dragSource.value.index === pileIndex) {
      dragSource.value = null;
      return;
    }
    await performMove(dragSource.value, "tableau", pileIndex);
    dragSource.value = null;
  }

  function onTableauDragEnter(pileIndex: number) {
    if (dragSource.value?.kind === "tableau" && dragSource.value.index === pileIndex) return;
    dragOverTarget.value = `tableau:${pileIndex}`;
  }

  function getDraggingCard(): Card | null {
    if (!dragSource.value || !game.value) return null;
    if (dragSource.value.kind === "waste") return topWaste.value;
    if (dragSource.value.kind === "foundation") {
      const pile = game.value.foundations[dragSource.value.index];
      return pile?.length ? pile[pile.length - 1] : null;
    }
    const pile = game.value.tableau[dragSource.value.index];
    if (!pile) return null;
    return pile[dragSource.value.cardIndex]?.card ?? null;
  }

  function canDropOnFoundation(index: number): boolean {
    if (!game.value) return false;
    const card = getDraggingCard();
    if (!card) return false;
    const pile = game.value.foundations[index];
    if (!pile) return false;
    const top = pile[pile.length - 1];
    if (top) {
      return top.suit === card.suit && card.rank === top.rank + 1;
    }
    return card.rank === 1 && suitOrder[index] === card.suit;
  }

  function onFoundationDragEnter(index: number) {
    if (canDropOnFoundation(index)) {
      dragOverTarget.value = `foundation:${index}`;
    } else {
      dragOverTarget.value = null;
    }
  }

  function onFoundationDragOver(event: DragEvent, index: number) {
    if (canDropOnFoundation(index)) {
      event.preventDefault();
    } else if (dragOverTarget.value === `foundation:${index}`) {
      dragOverTarget.value = null;
    }
  }

  function onDragLeave(event: DragEvent, key: string) {
    if (dragOverTarget.value === key) {
      const ct = event.currentTarget as HTMLElement;
      const rt = event.relatedTarget as Node | null;
      if (!rt || !ct.contains(rt)) {
        dragOverTarget.value = null;
      }
    }
  }

  function onDragEnd() {
    dragSource.value = null;
    dragOverTarget.value = null;
  }

  function isDraggingFrom(pileIndex: number, cardIndex: number): boolean {
    if (!dragSource.value || dragSource.value.kind !== "tableau") return false;
    return dragSource.value.index === pileIndex && cardIndex >= dragSource.value.cardIndex;
  }

  const isDraggingWaste = computed(() => dragSource.value?.kind === "waste");

  function isSelectedFoundation(index: number) {
    return selection.value?.kind === "foundation" && selection.value.index === index;
  }

  function isSelectedTableau(pileIndex: number, cardIndex: number) {
    return (
      selection.value?.kind === "tableau" &&
      selection.value.index === pileIndex &&
      selection.value.cardIndex === cardIndex
    );
  }

  const isSelectedWaste = computed(() => selection.value?.kind === "waste");

  async function setDrawMode(mode: 1 | 3) {
    drawMode.value = mode;
    game.value = setDrawCountBackend(mode);
  }

  onMounted(() => {
    newGame();
  });

  return {
    game,
    selection,
    message,
    drawMode,
    dragSource,
    dragOverTarget,
    topWaste,
    topFoundations,
    newGame,
    drawCard,
    selectWaste,
    handleFoundationClick,
    handleTableauCardClick,
    moveToFoundation,
    moveToTableau,
    onWasteDragStart,
    onTableauDragStart,
    onFoundationDrop,
    onFoundationDragEnter,
    onFoundationDragOver,
    onTableauDrop,
    onTableauDragEnter,
    onDragLeave,
    onDragEnd,
    isDraggingFrom,
    isDraggingWaste,
    isSelectedFoundation,
    isSelectedTableau,
    isSelectedWaste,
    setDrawMode,
  };
}
