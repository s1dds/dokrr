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

  function addEntries(newTree: TreeNode[], newFiles: Map<string, string>) {
    for (const [key, value] of newFiles) {
      files.value.set(key, value)
    }
    tree.value = [...tree.value, ...newTree]
  }

  function removeFolder(folderId: string) {
    // Collect all file IDs under this folder
    function collectFileIds(nodes: TreeNode[]): string[] {
      const ids: string[] = []
      for (const node of nodes) {
        if (node.type === 'file') ids.push(node.id)
        if (node.children) ids.push(...collectFileIds(node.children))
      }
      return ids
    }

    function removeFromTree(nodes: TreeNode[]): TreeNode[] {
      return nodes.filter((n) => {
        if (n.id === folderId && n.type === 'folder') {
          const fileIds = collectFileIds(n.children ?? [])
          for (const id of fileIds) files.value.delete(id)
          if (activeFileId.value && fileIds.includes(activeFileId.value)) {
            activeFileId.value = null
          }
          return false
        }
        if (n.children) n.children = removeFromTree(n.children)
        return true
      })
    }

    tree.value = removeFromTree(tree.value)
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
    addEntries,
    removeFolder,
    setActiveFile,
    toggleSidebar,
    reset,
  }
})
