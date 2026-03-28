import { useBookStore } from '~/stores/book'
import { getAllDirHandleIds } from '~/utils/storage'

const POLL_INTERVAL = 2000 // 2 seconds

/**
 * Polls stored directory handles for file changes and auto-reloads folders.
 * Runs only when the app has loaded books and handles are available.
 */
export function useDirWatcher() {
  const store = useBookStore()
  let timer: ReturnType<typeof setInterval> | null = null

  async function poll() {
    if (store.tree.length === 0) return

    const handleIds = await getAllDirHandleIds()
    for (const folderId of handleIds) {
      // Only reload folders that still exist in the tree
      if (!store.tree.some(n => n.id === folderId)) continue
      await store.reloadFolder(folderId)
    }
  }

  function start() {
    if (timer) return
    timer = setInterval(poll, POLL_INTERVAL)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(start)
  onUnmounted(stop)

  return { start, stop }
}
