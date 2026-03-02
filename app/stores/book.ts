import { defineStore } from 'pinia'
import type { TreeNode } from '~/types'

export const useBookStore = defineStore('book', () => {
  const tree = ref<TreeNode[]>([])
  const files = ref(new Map<string, string>())
  const activeFileId = ref<string | null>(null)
  const sidebarOpen = ref(true)

  const activeContent = computed(() => {
    if (!activeFileId.value) return null
    return files.value.get(activeFileId.value) ?? null
  })

  const activeFileName = computed(() => {
    if (!activeFileId.value) return ''
    const parts = activeFileId.value.split('/')
    return parts[parts.length - 1].replace(/\.md$/, '')
  })

  function loadBook(newTree: TreeNode[], newFiles: Map<string, string>) {
    tree.value = newTree
    files.value = newFiles
    activeFileId.value = null
  }

  function setActiveFile(id: string) {
    activeFileId.value = id
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function reset() {
    tree.value = []
    files.value = new Map()
    activeFileId.value = null
  }

  return {
    tree,
    files,
    activeFileId,
    activeContent,
    activeFileName,
    sidebarOpen,
    loadBook,
    setActiveFile,
    toggleSidebar,
    reset,
  }
})
