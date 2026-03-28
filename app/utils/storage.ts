import type { TreeNode } from '~/types'

const DB_NAME = 'md-book-viewer'
const DB_VERSION = 1
const STORE_STATE = 'state'
const STORE_HANDLES = 'handles'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE)
      }
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function idbGetAllKeys(db: IDBDatabase, store: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
}

export interface PersistedState {
  tree: TreeNode[]
  files: Record<string, string>
  activeFileId: string | null
  expandedFolderIds: string[]
  scrollPositions?: Record<string, number>
}

export async function saveState(
  tree: TreeNode[],
  files: Map<string, string>,
  activeFileId: string | null,
  expandedFolderIds: Set<string>,
  scrollPositions?: Map<string, number>,
): Promise<void> {
  const db = await openDB()
  // JSON round-trip strips Vue reactive proxies which cause DataCloneError
  const state: PersistedState = JSON.parse(JSON.stringify({
    tree,
    files: Object.fromEntries(files),
    activeFileId,
    expandedFolderIds: [...expandedFolderIds],
    scrollPositions: scrollPositions ? Object.fromEntries(scrollPositions) : undefined,
  }))
  await idbPut(db, STORE_STATE, 'current', state)
}

export async function loadState(): Promise<PersistedState | null> {
  const db = await openDB()
  const state = await idbGet<PersistedState>(db, STORE_STATE, 'current')
  return state ?? null
}

export async function clearState(): Promise<void> {
  const db = await openDB()
  await idbClear(db, STORE_STATE)
  await idbClear(db, STORE_HANDLES)
}

export async function saveDirHandle(
  folderId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDB()
  await idbPut(db, STORE_HANDLES, folderId, handle)
}

export async function getDirHandle(
  folderId: string,
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB()
  const handle = await idbGet<FileSystemDirectoryHandle>(db, STORE_HANDLES, folderId)
  return handle ?? null
}

export async function removeDirHandle(folderId: string): Promise<void> {
  const db = await openDB()
  await idbDelete(db, STORE_HANDLES, folderId)
}

export async function getAllDirHandleIds(): Promise<string[]> {
  const db = await openDB()
  return idbGetAllKeys(db, STORE_HANDLES)
}
