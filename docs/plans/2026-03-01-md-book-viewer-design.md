# Markdown Book Viewer — Design

## Overview

A client-side markdown book viewer built with Nuxt 4. Users upload a folder of markdown files (or a single file) via drag-and-drop or file picker. The app parses the folder structure, generates a table of contents in a collapsible sidebar, and renders markdown with syntax-highlighted code blocks.

All processing happens in the browser — no server-side storage.

## Architecture

- **Nuxt 4** SPA (`ssr: false`) — no server runtime needed after initial load
- **Pinia** — reactive store for book state (file tree, content, active chapter)
- **Tailwind CSS** — dark-first minimal UI
- **markdown-it** — markdown rendering
- **Shiki** — syntax highlighting with auto language detection
- **Client-side File API** — `<input webkitdirectory>` + drag-and-drop for folder/file uploads

## Components

| Component | Purpose |
|---|---|
| `UploadZone` | Landing page — drag/drop or click to upload folder/file |
| `AppSidebar` | Collapsible sidebar with recursive tree navigation |
| `SidebarItem` | Recursive component for folders/files in the tree |
| `ContentViewer` | Main area rendering the selected markdown chapter |
| `AppLayout` | Shell layout with sidebar + content split |

## Data Flow

1. User drops/selects folder via `UploadZone`
2. `FileReader` API reads all `.md` files, builds tree from relative paths
3. Store in Pinia: `{ tree: TreeNode[], files: Map<string, string>, activeFileId: string | null }`
4. Sidebar renders tree with collapsible folder nodes, clicking a file sets `activeFileId`
5. `ContentViewer` reactively renders the active file's markdown via markdown-it + Shiki

## Tree Structure

```ts
interface TreeNode {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: TreeNode[]
}
```

Files sorted alphabetically within each folder level to preserve intended reading order.

## Theme

- Tailwind `darkMode: 'class'`, dark applied by default
- Shiki dark theme (e.g. `vitesse-dark`) for code blocks
- Minimal, modern aesthetic — clean typography, subtle borders, no clutter

## Key Decisions

- **Client-side only**: files never leave the browser
- **Tree navigation**: folder hierarchy preserved with collapsible nodes
- **No routing**: single-page with state-driven content switching (no URL-based chapter routing needed)
- **No persistence**: refreshing the page clears the uploaded book (simple, no IndexedDB complexity)
