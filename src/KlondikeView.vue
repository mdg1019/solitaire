<script setup lang="ts">
import { ref } from "vue";
import { backUrl, suitIcons, suitOrder } from "./game/constants";
import { cardImage } from "./game/utils";
import { useGame } from "./game/useGame";
import menuUrl from "./assets/menu.svg";

const {
  game,
  message,
  drawMode,
  dragOverTarget,
  topWaste,
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
} = useGame();

const isMenuOpen = ref(false);

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}
</script>

<template>
  <main class="board">
    <div class="menu-bar">
      <button
        type="button"
        class="menu-button"
        :class="{ open: isMenuOpen }"
        aria-label="Open menu"
        :aria-expanded="isMenuOpen"
        @click="toggleMenu"
      >
        <img :src="menuUrl" alt="" />
      </button>
      <span class="menu-title">Menu</span>
    </div>

    <div class="menu-panel" :class="{ open: isMenuOpen }">
      <div class="menu-content">
        <button type="button" class="menu-action" @click="newGame">New Game</button>
        <div class="menu-group" role="group" aria-label="Draw mode">
          <label class="menu-radio">
            <input
              type="radio"
              name="draw-mode"
              :checked="drawMode === 1"
              @change="setDrawMode(1)"
            />
            Draw 1
          </label>
          <label class="menu-radio">
            <input
              type="radio"
              name="draw-mode"
              :checked="drawMode === 3"
              @change="setDrawMode(3)"
            />
            Draw 3
          </label>
        </div>
        <p v-if="message" class="message">{{ message }}</p>
      </div>
    </div>

    <header class="top-row">
      <div class="pile" @click="drawCard">
        <img v-if="game?.stock.length" :src="backUrl" class="card" alt="Stock" />
        <div v-else class="pile-empty"></div>
      </div>

      <div
        class="pile"
        @click="selectWaste"
        :draggable="!!topWaste"
        @dragstart="onWasteDragStart"
        @dragend="onDragEnd"
      >
        <img
          v-if="topWaste"
          :src="cardImage(topWaste)"
          class="card draggable-card"
          :class="{ selected: isSelectedWaste, 'dragging-source': isDraggingWaste }"
          alt="Waste"
        />
        <div v-else class="pile-empty"></div>
      </div>

      <div class="foundations">
        <div
          v-for="(pile, index) in game?.foundations"
          :key="index"
          class="pile foundation"
          :class="{ filled: pile.length, 'drag-over': dragOverTarget === `foundation:${index}` }"
          @click="moveToFoundation(index)"
          @dragover.prevent
          @dragenter.prevent="dragOverTarget = `foundation:${index}`"
          @dragleave="onDragLeave($event, `foundation:${index}`)"
          @drop="onFoundationDrop($event, index)"
        >
          <img
            v-if="pile.length"
            :src="cardImage(pile[pile.length - 1])"
            class="card"
            :class="{ selected: isSelectedFoundation(index) }"
            alt="Foundation"
            @click.stop="handleFoundationClick(index)"
          />
          <img
            v-else
            :src="suitIcons[suitOrder[index]]"
            class="foundation-icon"
            alt="Foundation"
          />
        </div>
      </div>

    </header>

    <section class="tableau">
      <div
        v-for="(pile, pileIndex) in game?.tableau"
        :key="pileIndex"
        class="tableau-pile"
        :class="{ 'drag-over': dragOverTarget === `tableau:${pileIndex}` }"
        @click="moveToTableau(pileIndex)"
        @dragover.prevent
        @dragenter.prevent="onTableauDragEnter(pileIndex)"
        @dragleave="onDragLeave($event, `tableau:${pileIndex}`)"
        @drop="onTableauDrop($event, pileIndex)"
      >
        <div
          v-for="(card, cardIndex) in pile"
          :key="card.card.id"
          class="tableau-card"
          :class="{ 'dragging-source': isDraggingFrom(pileIndex, cardIndex) }"
          :style="{ top: `${cardIndex * 26}px` }"
          :draggable="card.face_up"
          @click.stop="handleTableauCardClick(pileIndex, cardIndex)"
          @dragstart.stop="onTableauDragStart($event, pileIndex, cardIndex)"
          @dragend="onDragEnd"
        >
          <img
            v-if="card.face_up"
            :src="cardImage(card.card)"
            class="card draggable-card"
            :class="{
              selected: isSelectedTableau(pileIndex, cardIndex),
            }"
            alt="Card"
          />
          <img v-else :src="backUrl" class="card" alt="Card back" />
        </div>
        <div v-if="!pile.length" class="pile-empty tall"></div>
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.board {
  min-height: 100vh;
  min-width: 100%;
  padding: 24px;
  box-sizing: border-box;
  background: radial-gradient(circle at top, #2c7a4b, #115a36 60%, #0a3d23);
  color: #f4f1ea;
  display: flex;
  flex-direction: column;
}

.menu-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  transform: translateY(-9px);
  border-radius: 16px;
  background: rgba(6, 32, 18, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
}

.menu-button {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}

.menu-button img {
  width: 22px;
  height: 22px;
  filter: brightness(0) invert(1);
}

.menu-button.open {
  background: rgba(242, 216, 155, 0.2);
  border-color: rgba(242, 216, 155, 0.7);
}

.menu-title {
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(244, 241, 234, 0.85);
}

.menu-panel {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transform: translateY(-8px);
  transition: max-height 0.3s ease, opacity 0.2s ease, transform 0.2s ease;
}

.menu-panel.open {
  max-height: 240px;
  opacity: 1;
  transform: translateY(0);
  margin-top: 12px;
  margin-bottom: 28px;
}

.menu-content {
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(15, 61, 36, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.menu-action {
  background: #f2d89b;
  border: none;
  color: #2f2411;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
}

.menu-action:hover {
  background: #f6e3b2;
}

.menu-group {
  display: flex;
  gap: 16px;
  align-items: center;
}

.menu-radio {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  color: rgba(244, 241, 234, 0.9);
}

.menu-radio input {
  accent-color: #f2d89b;
}

.top-row {
  display: grid;
  grid-template-columns: 110px 110px 1fr;
  align-items: center;
  gap: 20px;
}

.foundations {
  display: flex;
  gap: 14px;
  justify-content: center;
}

.tableau {
  display: grid;
  grid-template-columns: repeat(7, minmax(110px, 1fr));
  gap: 18px;
  padding-top: 8px;
}

.pile,
.tableau-pile {
  position: relative;
  min-height: 150px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.pile.foundation {
  width: 110px;
  height: 150px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.12);
}

.pile.foundation.filled {
  border-color: transparent;
  background: transparent;
}

.card {
  width: 110px;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  -webkit-user-drag: none;
}

.draggable-card {
  pointer-events: none;
}

.foundation-icon {
  width: 60px;
  height: 60px;
  opacity: 0.6;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.3));
}

.card.selected {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 24px rgba(246, 214, 132, 0.6);
}

.pile-empty {
  width: 110px;
  height: 150px;
  border: 2px dashed rgba(255, 255, 255, 0.35);
  border-radius: 12px;
}

.pile-empty.tall {
  height: 150px;
}

.tableau-card {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.tableau-card[draggable="true"],
.pile[draggable="true"] {
  cursor: grab;
}

.dragging-source {
  opacity: 0.3;
}

.pile.foundation.drag-over {
  border-color: #f2d89b;
  box-shadow: 0 0 16px rgba(242, 216, 155, 0.5);
  background: rgba(242, 216, 155, 0.1);
}

.tableau-pile.drag-over {
  border-radius: 12px;
  box-shadow: 0 0 16px rgba(242, 216, 155, 0.4);
}

.message {
  font-size: 0.9rem;
  color: #f5c3c3;
  max-width: 240px;
}

@media (max-width: 900px) {
  .top-row {
    grid-template-columns: repeat(2, auto);
    grid-template-rows: auto auto;
    justify-content: space-between;
  }

  .tableau {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .card,
  .pile-empty {
    width: 95px;
  }
}
</style>
