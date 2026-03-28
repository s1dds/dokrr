export interface TreeNode {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: TreeNode[]
}

export interface FileEntry {
  path: string
  content: string
}
