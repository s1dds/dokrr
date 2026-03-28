<template>
  <div class="grain flex flex-col items-center justify-center min-h-screen p-8 relative overflow-hidden">
    <!-- Ambient background glow -->
    <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-warm/[0.03] blur-[120px] pointer-events-none" />

    <!-- Header -->
    <div class="text-center mb-16 relative z-10">
      <img src="/dokrr-logo.png" alt="Dokrr" class="h-16 mx-auto mb-4" />
      <p class="font-display text-sm text-ink-500 font-300 tracking-wide">
        A distraction-free reader for markdown documents
      </p>
    </div>

    <!-- Drop zone -->
    <div
      :class="[
        'relative w-full max-w-md transition-all duration-500 ease-out cursor-pointer group',
        isDragging ? 'scale-[1.02]' : '',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="openFilePicker"
    >
      <!-- Outer glow on drag -->
      <div
        :class="[
          'absolute -inset-px rounded-2xl transition-all duration-500',
          isDragging
            ? 'bg-gradient-to-b from-amber-warm/30 to-amber-warm/5 blur-sm'
            : 'bg-transparent',
        ]"
      />

      <div
        :class="[
          'relative rounded-2xl border transition-all duration-300 p-14 text-center',
          isDragging
            ? 'border-amber-warm/40 bg-amber-warm/[0.03]'
            : 'border-ink-800 bg-ink-900/40 hover:border-ink-600 hover:bg-ink-900/60',
        ]"
      >
        <div class="space-y-5">
          <!-- Upload icon -->
          <div
            :class="[
              'mx-auto w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
              isDragging
                ? 'bg-amber-warm/10 text-amber-warm'
                : 'bg-ink-800/60 text-ink-500 group-hover:text-ink-300 group-hover:bg-ink-800',
            ]"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          <div>
            <p class="font-display text-sm text-ink-300 font-400">
              Drop a folder here
            </p>
            <p class="font-display text-xs text-ink-600 mt-1.5">
              or click to browse &middot; accepts folders with .md files
            </p>
          </div>
        </div>
      </div>

      <!-- Fallback file input for browsers without showDirectoryPicker -->
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        webkitdirectory
        multiple
        accept=".md"
        @change="handleFileInput"
      />
    </div>

    <!-- Error message -->
    <Transition name="fade">
      <p v-if="error" class="mt-6 text-red-400/80 text-sm font-display">
        {{ error }}
      </p>
    </Transition>

    <!-- Loading -->
    <Transition name="fade">
      <div v-if="loading" class="mt-6 flex items-center gap-2 text-ink-500">
        <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="font-display text-sm">Parsing files...</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { FileEntry } from '~/types'
import { readDirectoryAsEntries } from '~/utils/directoryReader'

const emit = defineEmits<{
  filesLoaded: [entries: FileEntry[], handle?: FileSystemDirectoryHandle]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const error = ref('')
const loading = ref(false)

const hasDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window

async function openFilePicker() {
  if (hasDirectoryPicker) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' })
      loading.value = true
      error.value = ''

      const entries = await readDirectoryAsEntries(dirHandle)
      loading.value = false

      if (entries.length === 0) {
        error.value = 'No markdown files found'
        return
      }
      emit('filesLoaded', entries, dirHandle)
    }
    catch (e: any) {
      loading.value = false
      // User cancelled the picker
      if (e.name === 'AbortError') return
      error.value = e.message || 'Failed to read directory'
    }
  }
  else {
    // Fallback to webkitdirectory input
    fileInput.value?.click()
  }
}

async function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  error.value = ''
  loading.value = true

  const entries: FileEntry[] = []
  const promises = Array.from(input.files)
    .filter(f => f.name.endsWith('.md'))
    .map(async (file) => {
      const path = file.webkitRelativePath || file.name
      const content = await file.text()
      entries.push({ path, content })
    })

  await Promise.all(promises)
  loading.value = false

  if (entries.length === 0) {
    error.value = 'No markdown files found'
    return
  }
  emit('filesLoaded', entries)
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  error.value = ''

  const items = event.dataTransfer?.items
  if (!items) return

  loading.value = true

  // Try to get FileSystemDirectoryHandle (Chrome 86+) for persistence
  let dirHandle: FileSystemDirectoryHandle | undefined
  const handles: FileSystemHandle[] = []
  for (const item of Array.from(items)) {
    const handle = await item.getAsFileSystemHandle?.()
    if (handle) handles.push(handle)
  }

  if (handles.length > 0 && handles[0].kind === 'directory') {
    // Use handle-based reading
    dirHandle = handles[0] as FileSystemDirectoryHandle
    const entries = await readDirectoryAsEntries(dirHandle)
    loading.value = false

    if (entries.length === 0) {
      error.value = 'No markdown files found in the dropped items'
      return
    }
    emit('filesLoaded', entries, dirHandle)
    return
  }

  // Fallback: use webkitGetAsEntry
  const collected: { path: string; file: File }[] = []

  async function traverseEntry(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      const file = await new Promise<File>((resolve) => fileEntry.file(resolve))
      if (file.name.endsWith('.md')) {
        const path = entry.fullPath.replace(/^\//, '')
        collected.push({ path, file })
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const reader = dirEntry.createReader()
      let allEntries: FileSystemEntry[] = []
      let batch: FileSystemEntry[]
      do {
        batch = await new Promise<FileSystemEntry[]>((resolve) =>
          reader.readEntries(resolve),
        )
        allEntries = allEntries.concat(batch)
      } while (batch.length > 0)
      await Promise.all(allEntries.map(traverseEntry))
    }
  }

  const rootEntries = Array.from(items)
    .map(item => item.webkitGetAsEntry())
    .filter(Boolean) as FileSystemEntry[]

  await Promise.all(rootEntries.map(traverseEntry))

  const entries: FileEntry[] = await Promise.all(
    collected.map(async ({ path, file }) => ({
      path,
      content: await file.text(),
    })),
  )

  loading.value = false

  if (entries.length === 0) {
    error.value = 'No markdown files found in the dropped items'
    return
  }

  emit('filesLoaded', entries)
}
</script>
