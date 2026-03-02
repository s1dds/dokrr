import type { TreeNode } from '~/types'
import type { FileEntry } from '~/components/UploadZone.vue'

export function useFileParser() {
  function parseEntries(entries: FileEntry[]): {
    tree: TreeNode[]
    files: Map<string, string>
  } {
    const files = new Map<string, string>()
    const paths: string[] = []

    for (const entry of entries) {
      files.set(entry.path, entry.content)
      paths.push(entry.path)
    }

    paths.sort((a, b) => a.localeCompare(b))
    const tree = buildTree(paths)
    return { tree, files }
  }

  function buildTree(paths: string[]): TreeNode[] {
    const root: TreeNode[] = []

    for (const path of paths) {
      const parts = path.split('/')
      let current = root

      for (let i = 0; i < parts.length; i++) {
        const name = parts[i]
        const isFile = i === parts.length - 1

        let existing = current.find(
          (n) => n.name === name && n.type === (isFile ? 'file' : 'folder'),
        )

        if (!existing) {
          existing = {
            id: isFile ? path : parts.slice(0, i + 1).join('/'),
            name,
            type: isFile ? 'file' : 'folder',
            ...(isFile ? {} : { children: [] }),
          }
          current.push(existing)
        }

        if (!isFile && existing.children) {
          current = existing.children
        }
      }
    }

    return root
  }

  return { parseEntries }
}
