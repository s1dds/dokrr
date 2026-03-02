<template>
  <main ref="mainEl" class="flex-1 overflow-y-auto relative">
    <!-- Empty state -->
    <div
      v-if="!store.activeContent"
      class="flex items-center justify-center h-full"
    >
      <p class="font-display text-ink-600 text-sm">
        Select a chapter to begin reading
      </p>
    </div>

    <!-- Rendered markdown -->
    <Transition name="fade" mode="out-in" @enter="restoreScroll">
      <article
        v-if="store.activeContent"
        :key="store.activeFileId"
        class="prose prose-invert max-w-3xl mx-auto px-10 py-14"
        :style="{ zoom: scaleFactor }"
        v-html="renderedContent"
      />
    </Transition>

    <!-- Zoom control — bottom right, floating -->
    <div
      v-if="store.activeContent"
      class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
      @mouseenter="showSlider = true"
      @mouseleave="showSlider = false"
    >
      <!-- Preset circles — appear above the zoom icon on hover -->
      <Transition name="zoom-presets">
        <div v-show="showSlider" class="flex flex-col items-center gap-2">
          <button
            v-for="preset in presets"
            :key="preset.label"
            :class="[
              'w-9 h-9 rounded-full font-display text-[10px] font-500 transition-all duration-200 shrink-0 shadow-lg backdrop-blur-md border',
              isPresetActive(preset.value)
                ? 'bg-amber-warm border-amber-warm/60 text-ink-950'
                : 'bg-ink-900/90 border-ink-700/60 text-ink-400 hover:text-ink-200 hover:border-ink-600',
            ]"
            @click="setZoom(preset.value)"
          >
            {{ preset.label }}
          </button>
        </div>
      </Transition>

      <!-- Bottom row: slider pill + zoom icon -->
      <div class="flex items-center gap-2">
        <!-- Slider pill — appears on hover to the left -->
        <Transition name="zoom-slider">
          <div
            v-show="showSlider"
            class="flex items-center gap-2 bg-ink-900/90 backdrop-blur-md border border-ink-700/60 rounded-full px-3 py-2 shadow-lg"
          >
            <input
              type="range"
              :min="0"
              :max="100"
              :value="zoomValue"
              class="zoom-range w-24"
              @input="onZoomInput"
            />
            <span class="font-display text-[10px] text-ink-500 whitespace-nowrap select-none w-7 text-right">
              {{ zoomPercent }}%
            </span>
          </div>
        </Transition>

        <!-- Zoom icon button -->
        <button
          class="w-9 h-9 rounded-full bg-ink-900/90 backdrop-blur-md border border-ink-700/60 flex items-center justify-center text-ink-400 hover:text-ink-200 hover:border-ink-600 transition-all shadow-lg"
          title="Zoom content"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 8.25v4.5m2.25-2.25h-4.5" />
          </svg>
        </button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useBookStore } from '~/stores/book'
import { useMarkdownRenderer } from '~/composables/useMarkdownRenderer'

const store = useBookStore()
const { init, render, isReady } = useMarkdownRenderer()

const mainEl = ref<HTMLElement | null>(null)
const showSlider = ref(false)
const zoomValue = ref(0) // 0–100 range, 0 = 1x (default)
const scrollPositions = new Map<string, number>()

const MIN_SCALE = 1.0   // 100%
const MAX_SCALE = 1.5   // 150%

const presets = [
  { label: '1x', value: 0 },      // 100%
  { label: '1.25x', value: 50 },  // 125%
  { label: '1.5x', value: 100 },  // 150%
]

onMounted(() => {
  init()
})

// Save scroll position when switching away
watch(() => store.activeFileId, (_newId, oldId) => {
  if (oldId && mainEl.value) {
    scrollPositions.set(oldId, mainEl.value.scrollTop)
  }
})

// Restore scroll position after new content has faded in
function restoreScroll() {
  if (!mainEl.value || !store.activeFileId) return
  const saved = scrollPositions.get(store.activeFileId)
  mainEl.value.scrollTop = saved ?? 0
}

// Interpolate between MIN_SCALE and MAX_SCALE
const scaleFactor = computed(() => {
  return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * (zoomValue.value / 100)
})

const zoomPercent = computed(() => {
  return Math.round(scaleFactor.value * 100)
})

function onZoomInput(event: Event) {
  const target = event.target as HTMLInputElement
  zoomValue.value = Number(target.value)
}

function setZoom(value: number) {
  zoomValue.value = value
}

function isPresetActive(value: number): boolean {
  return zoomValue.value === value
}

const renderedContent = computed(() => {
  if (!isReady.value || !store.activeContent) return ''
  return render(store.activeContent)
})
</script>

<style scoped>
/* Slider expand/collapse transition */
.zoom-slider-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.zoom-slider-leave-active {
  transition: opacity 0.15s ease, transform 0.2s ease, width 0.2s ease;
}
.zoom-slider-enter-from,
.zoom-slider-leave-to {
  opacity: 0;
  transform: translateX(8px) scale(0.95);
}

/* Presets vertical expand/collapse transition */
.zoom-presets-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.zoom-presets-leave-active {
  transition: opacity 0.15s ease, transform 0.2s ease;
}
.zoom-presets-enter-from,
.zoom-presets-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}

/* Custom range input styling */
.zoom-range {
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  background: #27272c;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}

.zoom-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e8a040;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.zoom-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.zoom-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e8a040;
  border: none;
  cursor: pointer;
}

.zoom-range::-moz-range-track {
  height: 3px;
  background: #27272c;
  border-radius: 999px;
}
</style>
