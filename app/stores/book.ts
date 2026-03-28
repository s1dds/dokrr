import { defineStore } from 'pinia'
import type { TreeNode } from '~/types'
import type { FileEntry } from '~/components/UploadZone.vue'
import {
  saveState,
  loadState,
  clearState,
  saveDirHandle,
  getDirHandle,
  removeDirHandle,
} from '~/utils/storage'
import { readDirectoryAsEntries } from '~/utils/directoryReader'
import { useFileParser } from '~/composables/useFileParser'

export const useBookStore = defineStore('book', () => {
  const tree = ref<TreeNode[]>([])
  const files = ref(new Map<string, string>())
  const activeFileId = ref<string | null>(null)
  const sidebarOpen = ref(true)
  const expandedFolderIds = ref(new Set<string>())

  // Maps root folder IDs to their directory handles (in-memory, persisted to IndexedDB separately)
  const dirHandles = new Map<string, FileSystemDirectoryHandle>()

  // Scroll positions per file (persisted across reloads)
  const scrollPositions = ref(new Map<string, number>())

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
    expandedFolderIds.value = new Set(
      newTree.filter(n => n.type === 'folder').map(n => n.id),
    )
    persist()
  }

  let addCounter = 0
  function addEntries(newTree: TreeNode[], newFiles: Map<string, string>) {
    addCounter++
    const prefix = `__added_${addCounter}__`

    // Prefix IDs to avoid collisions with existing entries
    function prefixNode(node: TreeNode): TreeNode {
      const newNode: TreeNode = {
        ...node,
        id: prefix + node.id,
      }
      if (node.children) {
        newNode.children = node.children.map(prefixNode)
      }
      return newNode
    }

    const prefixedTree = newTree.map(prefixNode)
    for (const [key, value] of newFiles) {
      files.value.set(prefix + key, value)
    }
    tree.value = [...tree.value, ...prefixedTree]
    persist()
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

    // Clean up directory handle
    dirHandles.delete(folderId)
    removeDirHandle(folderId)
    persist()
  }

  /**
   * Store a directory handle for a root folder (enables reload).
   */
  function setDirHandle(folderId: string, handle: FileSystemDirectoryHandle) {
    dirHandles.set(folderId, handle)
    saveDirHandle(folderId, handle)
  }

  /**
   * Check if a folder has a stored directory handle (reload capable).
   */
  function hasDirHandle(folderId: string): boolean {
    return dirHandles.has(folderId)
  }

  function collectFileIds(nodes: TreeNode[]): string[] {
    const ids: string[] = []
    for (const node of nodes) {
      if (node.type === 'file') ids.push(node.id)
      if (node.children) ids.push(...collectFileIds(node.children))
    }
    return ids
  }

  /**
   * Reload a folder from its stored directory handle.
   * Diffs against current state — only updates store if files were added, removed, or modified.
   */
  async function reloadFolder(folderId: string): Promise<boolean> {
    let handle = dirHandles.get(folderId)

    // Try loading from IndexedDB if not in memory
    if (!handle) {
      handle = await getDirHandle(folderId) ?? undefined
      if (handle) dirHandles.set(folderId, handle)
    }

    if (!handle) return false

    // Re-request permission if needed
    const permission = await handle.requestPermission({ mode: 'read' })
    if (permission !== 'granted') return false

    const { parseEntries } = useFileParser()
    const entries = await readDirectoryAsEntries(handle)
    if (entries.length === 0) return false

    const { tree: newSubTree, files: newFiles } = parseEntries(entries)

    // Determine the prefix used for this folder (if added via +)
    const prefix = folderId.match(/^(__added_\d+__)/)?.[1] ?? ''

    // Build prefixed file map for comparison
    const prefixedNewFiles = new Map<string, string>()
    for (const [key, value] of newFiles) {
      prefixedNewFiles.set(prefix + key, value)
    }

    // Get current file IDs for this folder
    const oldFolder = tree.value.find(n => n.id === folderId)
    const oldFileIds = oldFolder?.children ? collectFileIds([oldFolder]) : []
    const newFileIds = [...prefixedNewFiles.keys()]

    // Diff: check for added, removed, or modified files
    const oldSet = new Set(oldFileIds)
    const newSet = new Set(newFileIds)

    const added = newFileIds.filter(id => !oldSet.has(id))
    const removed = oldFileIds.filter(id => !newSet.has(id))
    const modified = newFileIds.filter((id) => {
      if (!oldSet.has(id)) return false
      return files.value.get(id) !== prefixedNewFiles.get(id)
    })

    // No changes — skip update entirely
    if (added.length === 0 && removed.length === 0 && modified.length === 0) {
      return false
    }

    // Apply changes: remove old files, add new ones
    for (const id of oldFileIds) {
      files.value.delete(id)
    }

    for (const [key, value] of prefixedNewFiles) {
      files.value.set(key, value)
    }

    // Rebuild tree for this folder
    function prefixNode(node: TreeNode): TreeNode {
      const newNode: TreeNode = { ...node, id: prefix + node.id }
      if (node.children) newNode.children = node.children.map(prefixNode)
      return newNode
    }

    const prefixedSubTree = prefix ? newSubTree.map(prefixNode) : newSubTree

    tree.value = tree.value.map((n) => {
      if (n.id === folderId) {
        const replacement = prefixedSubTree.find(s => s.id === folderId)
        if (replacement) return replacement
        return prefixedSubTree[0] ? { ...prefixedSubTree[0], id: folderId } : n
      }
      return n
    })

    // Clear active file if it was removed
    if (activeFileId.value && !files.value.has(activeFileId.value)) {
      activeFileId.value = null
    }

    persist()
    return true
  }

  /**
   * Restore state from IndexedDB on app load.
   */
  async function restore(): Promise<boolean> {
    const state = await loadState()
    if (!state || state.tree.length === 0) return false

    tree.value = state.tree
    files.value = new Map(Object.entries(state.files))
    activeFileId.value = state.activeFileId
    expandedFolderIds.value = new Set(state.expandedFolderIds)
    if (state.scrollPositions) {
      scrollPositions.value = new Map(Object.entries(state.scrollPositions))
    }
    return true
  }

  function saveScrollPosition(fileId: string, position: number) {
    scrollPositions.value.set(fileId, position)
    persist()
  }

  function getScrollPosition(fileId: string): number {
    return scrollPositions.value.get(fileId) ?? 0
  }

  function setActiveFile(id: string) {
    activeFileId.value = id
    persist()
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function reset() {
    tree.value = []
    files.value = new Map()
    activeFileId.value = null
    scrollPositions.value = new Map()
    dirHandles.clear()
    clearState()
  }

  // Debounced persistence to avoid thrashing IndexedDB
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  function persist() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(flushPersist, 300)
  }

  function flushPersist() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = null
    saveState(tree.value, files.value, activeFileId.value, expandedFolderIds.value, scrollPositions.value)
  }

  return {
    tree,
    files,
    activeFileId,
    activeContent,
    activeFileName,
    sidebarOpen,
    expandedFolderIds,
    loadBook,
    addEntries,
    removeFolder,
    setActiveFile,
    toggleSidebar,
    reset,
    scrollPositions,
    saveScrollPosition,
    getScrollPosition,
    setDirHandle,
    hasDirHandle,
    reloadFolder,
    restore,
    flushPersist,
  }
})
