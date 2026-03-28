<template>
  <aside
    :class="[
      'h-screen bg-ink-950 transition-all duration-300 ease-out flex flex-col shrink-0 border-r border-ink-800/60',
      store.sidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-r-0',
    ]"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3.5 shrink-0">
      <h2 class="font-display text-[11px] font-500 text-ink-500 uppercase tracking-[0.1em]">
        Contents
      </h2>
      <div class="flex items-center gap-0.5">
        <button
          class="text-ink-600 hover:text-ink-300 transition-colors p-1 rounded-md hover:bg-ink-800/40"
          title="Add folder"
          @click="openFolderPicker"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
        <button
          class="text-ink-600 hover:text-ink-300 transition-colors p-1 rounded-md hover:bg-ink-800/40"
          title="Close book"
          @click="store.reset()"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <!-- Fallback file input for browsers without showDirectoryPicker -->
      <input
        ref="folderInput"
        type="file"
        class="hidden"
        webkitdirectory
        multiple
        accept=".md"
        @change="handleFolderInput"
      />
    </div>

    <!-- Divider -->
    <div class="h-px bg-ink-800/60 mx-3" />

    <!-- Tree -->
    <nav class="flex-1 overflow-y-auto p-3 pt-2">
      <ul class="space-y-0.5">
        <SidebarItem
          v-for="node in store.tree"
          :key="node.id"
          :node="node"
        />
      </ul>
    </nav>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-ink-800/40">
      <p class="font-display text-[10px] text-ink-600">
        {{ fileCount }} file{{ fileCount !== 1 ? 's' : '' }}
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { FileEntry } from '~/components/UploadZone.vue'
import { useBookStore } from '~/stores/book'
import { useFileParser } from '~/composables/useFileParser'
import { readDirectoryAsEntries } from '~/utils/directoryReader'

const store = useBookStore()
const { parseEntries } = useFileParser()

const folderInput = ref<HTMLInputElement | null>(null)
const fileCount = computed(() => store.files.size)

const hasDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window

async function openFolderPicker() {
  if (hasDirectoryPicker) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' })
      const entries = await readDirectoryAsEntries(dirHandle)
      if (entries.length > 0) {
        const { tree, files } = parseEntries(entries)
        store.addEntries(tree, files)

        // Store handle for reload — find the newly added root folder ID
        const rootFolders = tree.filter(n => n.type === 'folder')
        for (const folder of rootFolders) {
          // addEntries prefixes IDs, so we need to find the prefixed ID in the store
          const addedFolder = store.tree.find(
            n => n.type === 'folder' && n.name === folder.name && !store.hasDirHandle(n.id),
          )
          if (addedFolder) {
            store.setDirHandle(addedFolder.id, dirHandle)
          }
        }
      }
    }
    catch (e: any) {
      if (e.name === 'AbortError') return
    }
  }
  else {
    folderInput.value?.click()
  }
}

async function handleFolderInput(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const entries: FileEntry[] = []
  await Promise.all(
    Array.from(input.files)
      .filter(f => f.name.endsWith('.md'))
      .map(async (file) => {
        const path = file.webkitRelativePath || file.name
        const content = await file.text()
        entries.push({ path, content })
      }),
  )

  if (entries.length > 0) {
    const { tree, files } = parseEntries(entries)
    store.addEntries(tree, files)
  }

  input.value = ''
}
</script>
