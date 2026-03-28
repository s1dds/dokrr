import type { FileEntry } from '~/types'

/**
 * Recursively reads all .md files from a FileSystemDirectoryHandle.
 */
export async function readDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  basePath = '',
): Promise<FileEntry[]> {
  const entries: FileEntry[] = []
  const prefix = basePath ? `${basePath}/` : ''

  for await (const entry of dirHandle.values()) {
    const entryPath = `${prefix}${entry.name}`

    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      const fileHandle = entry as FileSystemFileHandle
      const file = await fileHandle.getFile()
      const content = await file.text()
      entries.push({ path: entryPath, content })
    }
    else if (entry.kind === 'directory') {
      const subDir = entry as FileSystemDirectoryHandle
      const subEntries = await readDirectoryHandle(subDir, entryPath)
      entries.push(...subEntries)
    }
  }

  return entries
}

/**
 * Wraps entries under the directory name as root path.
 */
export async function readDirectoryAsEntries(
  dirHandle: FileSystemDirectoryHandle,
): Promise<FileEntry[]> {
  const raw = await readDirectoryHandle(dirHandle)
  // Prefix all paths with the directory name
  return raw.map(e => ({
    path: `${dirHandle.name}/${e.path}`,
    content: e.content,
  }))
}
