<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { Card } from "./game/types";
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
  canUndo,
  hasWon,
  newGame,
  undo,
  simulateWin,
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
} = useGame();

const isMenuOpen = ref(false);
const dismissedWin = ref(false);
const showWin = computed(() => hasWon.value && !dismissedWin.value);
const showDebugControls = false;
const winCanvas = ref<HTMLCanvasElement | null>(null);
let fireworkFrame: number | null = null;
let fireworkTimeout: number | null = null;

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
}

function newGameFromMenu() {
  newGame();
  closeMenu();
}

function undoFromMenu() {
  undo();
  closeMenu();
}

function simulateWinFromMenu() {
  simulateWin();
  closeMenu();
}

function setDrawModeFromMenu(mode: 1 | 3) {
  setDrawMode(mode);
  closeMenu();
}

function getSuitIcon(index: number): string {
  const suit = suitOrder[index];
  return suit ? suitIcons[suit] : "";
}

function getFoundationTop(pile: Card[]): Card | null {
  return pile.length ? pile[pile.length - 1]! : null;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

function startFireworks() {
  const canvasEl = winCanvas.value;
  if (!canvasEl) return;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  const canvas = canvasEl;
  const context = ctx;

  const particles: Particle[] = [];
  const colors = ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#f9c74f"];
  const start = performance.now();

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function burst() {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight * 0.55 + 40;
    const color = colors[Math.floor(Math.random() * colors.length)] ?? "#ffd166";
    const count = 36 + Math.floor(Math.random() * 24);
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = 2 + Math.random() * 3.8;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  function animate(now: number) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (Math.random() < 0.12) burst();
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      if (!p) continue;
      p.life += 1;
      p.vy += 0.03;
      p.x += p.vx;
      p.y += p.vy;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      context.globalAlpha = alpha;
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      }
    }
    context.globalAlpha = 1;

    if (now - start < 10000) {
      fireworkFrame = requestAnimationFrame(animate);
    }
  }

  resize();
  window.addEventListener("resize", resize);
  fireworkFrame = requestAnimationFrame(animate);
  fireworkTimeout = window.setTimeout(() => {
    if (fireworkFrame) cancelAnimationFrame(fireworkFrame);
    fireworkFrame = null;
    window.removeEventListener("resize", resize);
    context.clearRect(0, 0, canvas.width, canvas.height);
    dismissedWin.value = true;
  }, 10000);
}

function stopFireworks() {
  if (fireworkFrame) cancelAnimationFrame(fireworkFrame);
  fireworkFrame = null;
  if (fireworkTimeout) clearTimeout(fireworkTimeout);
  fireworkTimeout = null;
}

watch(
  () => hasWon.value,
  (won) => {
    if (won) {
      dismissedWin.value = false;
      nextTick(() => {
        startFireworks();
      });
    } else {
      dismissedWin.value = false;
      stopFireworks();
    }
  },
  { immediate: true },
);

onMounted(() => {
  const handler = (event: KeyboardEvent) => {
    if (event.key === "Escape" && hasWon.value) {
      dismissedWin.value = true;
      stopFireworks();
    }
  };
  window.addEventListener("keydown", handler);
  onUnmounted(() => {
    window.removeEventListener("keydown", handler);
  });
});

onUnmounted(() => {
  stopFireworks();
});
</script>

<template>
  <main class="board" :class="{ 'win-active': showWin }">
    <transition name="win-fade">
      <div v-if="showWin" class="win-overlay" role="status" aria-live="polite">
        <canvas ref="winCanvas" class="win-canvas" aria-hidden="true"></canvas>
        <div class="win-message">You Win!!!</div>
      </div>
    </transition>
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
      <button
        v-if="showDebugControls"
        type="button"
        class="menu-action menu-win"
        @click="simulateWinFromMenu"
      >
        Simulate Win
      </button>
    </div>

    <div class="menu-panel" :class="{ open: isMenuOpen }">
      <div class="menu-content">
        <button type="button" class="menu-action" @click="newGameFromMenu">New Game</button>
        <button type="button" class="menu-action" :disabled="!canUndo" @click="undoFromMenu">
          Undo (Ctrl+Z)
        </button>
        <div class="menu-group" role="group" aria-label="Draw mode">
          <label class="menu-radio">
            <input
              type="radio"
              name="draw-mode"
              :checked="drawMode === 1"
              @change="setDrawModeFromMenu(1)"
            />
            Draw 1
          </label>
          <label class="menu-radio">
            <input
              type="radio"
              name="draw-mode"
              :checked="drawMode === 3"
              @change="setDrawModeFromMenu(3)"
            />
            Draw 3
          </label>
        </div>
        <p v-if="message" class="message">{{ message }}</p>
      </div>
    </div>
    <div v-if="isMenuOpen" class="menu-backdrop" @click="closeMenu" aria-hidden="true"></div>

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
          @dragover="onFoundationDragOver($event, index)"
          @dragenter.prevent="onFoundationDragEnter(index)"
          @dragleave="onDragLeave($event, `foundation:${index}`)"
          @drop="onFoundationDrop($event, index)"
        >
          <img
            v-if="pile.length"
            :src="cardImage(getFoundationTop(pile)!)"
            class="card"
            :class="{ selected: isSelectedFoundation(index) }"
            alt="Foundation"
            @click.stop="handleFoundationClick(index)"
          />
          <img
            v-else
            :src="getSuitIcon(index)"
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
  gap: 10px;
  --card-width: 110px;
  --card-height: 150px;
  --tableau-offset: 26px;
  --tableau-max-cards: 13;
}

.board.win-active {
  gap: 18px;
}

.win-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(6, 32, 18, 0.72);
  display: grid;
  place-items: center;
  pointer-events: none;
}

.win-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.win-message {
  position: relative;
  z-index: 1;
  font-size: clamp(36px, 7vw, 96px);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffe28a;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.win-fade-enter-active,
.win-fade-leave-active {
  transition: opacity 0.35s ease;
}

.win-fade-enter-from,
.win-fade-leave-to {
  opacity: 0;
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
  position: relative;
  z-index: 10;
}

.menu-win {
  margin-left: auto;
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
  position: relative;
  z-index: 10;
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

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5;
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

.menu-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
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
  grid-template-columns: var(--card-width) var(--card-width) 1fr;
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
  grid-template-columns: repeat(7, minmax(var(--card-width), 1fr));
  gap: 18px;
  padding-top: 8px;
  min-height: calc(
    var(--card-height) + var(--tableau-offset) * (var(--tableau-max-cards) - 1)
  );
}

.board.win-active .tableau {
  padding-top: 16px;
}

.pile,
.tableau-pile {
  position: relative;
  min-height: var(--card-height);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.pile.foundation {
  width: var(--card-width);
  height: var(--card-height);
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
  width: var(--card-width);
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
  width: var(--card-width);
  height: var(--card-height);
  border: 2px dashed rgba(255, 255, 255, 0.35);
  border-radius: 12px;
}

.pile-empty.tall {
  height: var(--card-height);
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
  .board {
    --card-width: 95px;
  }

  .top-row {
    grid-template-columns: repeat(2, auto);
    grid-template-rows: auto auto;
    justify-content: space-between;
  }

  .tableau {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

}
</style>
