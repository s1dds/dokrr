<template>
  <div>
    <!-- Upload landing -->
    <UploadZone v-if="!store.tree.length" @files-loaded="handleFiles" />

    <!-- Reader layout -->
    <div v-else class="flex h-screen">
      <AppSidebar />

      <div class="flex-1 flex flex-col min-w-0">
        <!-- Top bar -->
        <header class="flex items-center gap-3 px-5 py-2.5 border-b border-ink-800/40 shrink-0 bg-ink-950/80 backdrop-blur-sm">
          <button
            class="text-ink-500 hover:text-ink-200 transition-colors p-1.5 rounded-lg hover:bg-ink-800/40"
            title="Toggle sidebar"
            @click="store.toggleSidebar()"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div class="h-4 w-px bg-ink-800/60" />

          <span class="font-display text-[13px] text-ink-400 truncate">
            {{ store.activeFileName }}
          </span>
        </header>

        <ContentViewer />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '~/types'
import type { FileEntry } from '~/components/UploadZone.vue'
import { useBookStore } from '~/stores/book'
import { useFileParser } from '~/composables/useFileParser'

const store = useBookStore()
const { parseEntries } = useFileParser()

function hasSubFolders(nodes: TreeNode[]): boolean {
  for (const node of nodes) {
    if (node.type === 'folder') {
      if (node.children?.some(c => c.type === 'folder')) return true
      if (node.children && hasSubFolders(node.children)) return true
    }
  }
  return false
}

function findFirstFile(nodes: TreeNode[]): TreeNode | null {
  for (const node of nodes) {
    if (node.type === 'file') return node
    if (node.children) {
      const found = findFirstFile(node.children)
      if (found) return found
    }
  }
  return null
}

function handleFiles(entries: FileEntry[]) {
  const { tree, files } = parseEntries(entries)
  store.loadBook(tree, files)

  if (!hasSubFolders(tree)) {
    const firstFile = findFirstFile(tree)
    if (firstFile) store.setActiveFile(firstFile.id)
  }
}
</script>
