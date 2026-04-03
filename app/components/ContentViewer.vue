<template>
  <main ref="mainEl" class="flex-1 overflow-y-auto relative" @scroll="onScroll">
    <!-- Empty state -->
    <div
      v-if="!store.activeContent"
      class="flex items-center justify-center h-full"
    >
      <p class="font-display text-ink-600 text-sm">
        Select a document to begin reading
      </p>
    </div>

    <!-- Rendered markdown -->
    <Transition name="fade" mode="out-in" @enter="restoreScroll">
      <article
        v-if="store.activeContent && isReady"
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
import mermaid from 'mermaid'
import { useBookStore } from '~/stores/book'
import { useMarkdownRenderer } from '~/composables/useMarkdownRenderer'

const store = useBookStore()
const { init, render, isReady } = useMarkdownRenderer()

const mainEl = ref<HTMLElement | null>(null)
const showSlider = ref(false)
const zoomValue = ref(0) // 0–100 range, 0 = 1x (default)

const MIN_SCALE = 1.0   // 100%
const MAX_SCALE = 1.5   // 150%

const presets = [
  { label: '1x', value: 0 },      // 100%
  { label: '1.25x', value: 50 },  // 125%
  { label: '1.5x', value: 100 },  // 150%
]

onMounted(() => {
  init()
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1c1c20',
      primaryTextColor: '#c8c8d4',
      primaryBorderColor: '#5F7D7B',
      lineColor: '#5F7D7B',
      secondaryColor: '#111113',
      tertiaryColor: '#1c1c20',
      fontFamily: 'Sora, sans-serif',
    },
  })
})

// Save scroll position on scroll (debounced) — keeps IndexedDB up-to-date continuously
let scrollTimer: ReturnType<typeof setTimeout> | null = null
function onScroll() {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    if (store.activeFileId && mainEl.value) {
      store.saveScrollPosition(store.activeFileId, mainEl.value.scrollTop)
    }
  }, 300)
}

// Save scroll position when switching away (immediate, not debounced)
watch(() => store.activeFileId, (_newId, oldId) => {
  if (oldId && mainEl.value) {
    if (scrollTimer) clearTimeout(scrollTimer)
    store.saveScrollPosition(oldId, mainEl.value.scrollTop)
  }
})

// Also restore on transition enter (handles normal navigation between files)
function restoreScroll() {
  if (!mainEl.value || !store.activeFileId) return
  mainEl.value.scrollTop = store.getScrollPosition(store.activeFileId)
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

// Render mermaid diagrams after content is inserted into the DOM
let mermaidCounter = 0
watch(renderedContent, async () => {
  await nextTick()
  if (!mainEl.value) return
  const preSources = mainEl.value.querySelectorAll('pre.mermaid-source')
  for (const pre of preSources) {
    if (pre.dataset.mermaidRendered) continue
    pre.dataset.mermaidRendered = 'true'
    const block = pre.querySelector('code')
    const id = `mermaid-${++mermaidCounter}`
    try {
      const { svg } = await mermaid.render(id, block?.textContent || '')
      const wrapper = document.createElement('div')
      wrapper.className = 'mermaid-diagram'

      const inner = document.createElement('div')
      inner.className = 'mermaid-inner'
      inner.innerHTML = svg
      wrapper.appendChild(inner)

      // Pan & zoom state
      let scale = 1
      let panX = 0
      let panY = 0
      let dragging = false
      let startX = 0
      let startY = 0

      function applyTransform() {
        inner.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`
      }

      // Wheel zoom
      wrapper.addEventListener('wheel', (e) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        scale = Math.min(5, Math.max(0.3, scale + delta))
        applyTransform()
      }, { passive: false })

      // Drag to pan
      wrapper.addEventListener('mousedown', (e) => {
        dragging = true
        startX = e.clientX - panX
        startY = e.clientY - panY
        wrapper.style.cursor = 'grabbing'
      })

      window.addEventListener('mousemove', (e) => {
        if (!dragging) return
        panX = e.clientX - startX
        panY = e.clientY - startY
        applyTransform()
      })

      window.addEventListener('mouseup', () => {
        if (!dragging) return
        dragging = false
        wrapper.style.cursor = 'grab'
      })

      // Double-click to reset
      wrapper.addEventListener('dblclick', () => {
        scale = 1
        panX = 0
        panY = 0
        applyTransform()
      })

      pre.replaceWith(wrapper)
    }
    catch {
      // Leave as code block if mermaid parsing fails
    }
  }
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

<style>
/* Mermaid diagram styling (unscoped so it applies to dynamically inserted elements) */
.mermaid-diagram {
  position: relative;
  margin: 1.5em 0;
  background: #111113;
  border-radius: 8px;
  border: 1px solid #1c1c20;
  overflow: hidden;
  cursor: grab;
  min-height: 200px;
}

.mermaid-inner {
  display: flex;
  justify-content: center;
  padding: 1em;
  transform-origin: center center;
  transition: none;
  user-select: none;
}

.mermaid-inner svg {
  max-width: 100%;
  height: auto;
}
</style>
