# Markdown Book Viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a client-side markdown book viewer where users upload a folder of `.md` files, browse them via a collapsible tree sidebar, and read rendered markdown with syntax-highlighted code blocks.

**Architecture:** Nuxt 4 SPA (`ssr: false`) with Pinia for state, Tailwind CSS for styling, markdown-it for rendering, and Shiki for code highlighting. All file processing happens client-side via the File API.

**Tech Stack:** Nuxt 4, Vue 3, Pinia, Tailwind CSS, markdown-it, Shiki, TypeScript

---

### Task 1: Scaffold Nuxt 4 Project

**Files:**
- Create: project root via `nuxt init`
- Modify: `nuxt.config.ts`
- Modify: `app/app.vue`

**Step 1: Create Nuxt 4 project**

Run:
```bash
npx nuxi@latest init md-book-viewer-cc --force --packageManager npm
```

This scaffolds into the current directory. Use `--force` since the directory already exists.

**Step 2: Install dependencies**

Run:
```bash
npm install
npm install @pinia/nuxt @nuxtjs/tailwindcss markdown-it shiki
npm install -D @types/markdown-it
```

**Step 3: Configure nuxt.config.ts**

```typescript
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-05-01',

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],

  tailwindcss: {
    config: {
      darkMode: 'class',
      content: [],
      theme: {
        extend: {},
      },
    },
  },

  app: {
    head: {
      title: 'MD Book Viewer',
      htmlAttrs: { class: 'dark' },
      meta: [
        { name: 'description', content: 'A markdown book viewer' },
      ],
    },
  },
})
```

**Step 4: Set up base app/app.vue**

```vue
<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <NuxtPage />
  </div>
</template>
```

**Step 5: Create app/pages/index.vue placeholder**

```vue
<template>
  <div class="flex items-center justify-center min-h-screen">
    <p class="text-zinc-400">MD Book Viewer</p>
  </div>
</template>
```

**Step 6: Verify it runs**

Run: `npm run dev`
Expected: App loads at localhost:3000 with dark background and centered text.

**Step 7: Commit**

```bash
git init
echo "node_modules\n.nuxt\n.output\ndist" > .gitignore
git add -A
git commit -m "feat: scaffold Nuxt 4 project with Pinia and Tailwind"
```

---

### Task 2: Pinia Book Store

**Files:**
- Create: `app/stores/book.ts`
- Create: `app/types/index.ts`

**Step 1: Create types**

Create `app/types/index.ts`:

```typescript
export interface TreeNode {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: TreeNode[]
}

export interface BookState {
  tree: TreeNode[]
  files: Map<string, string>
  activeFileId: string | null
  sidebarOpen: boolean
}
```

**Step 2: Create the Pinia store**

Create `app/stores/book.ts`:

```typescript
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
    sidebarOpen,
    loadBook,
    setActiveFile,
    toggleSidebar,
    reset,
  }
})
```

**Step 3: Verify dev server still runs**

Run: `npm run dev`
Expected: No errors.

**Step 4: Commit**

```bash
git add app/types/index.ts app/stores/book.ts
git commit -m "feat: add Pinia book store with tree and file state"
```

---

### Task 3: File Parsing Composable

**Files:**
- Create: `app/composables/useFileParser.ts`

**Step 1: Create the file parser composable**

This composable takes files from a drag-drop or file input and builds the tree + content map.

Create `app/composables/useFileParser.ts`:

```typescript
import type { TreeNode } from '~/types'

export function useFileParser() {
  async function parseFiles(fileList: FileList): Promise<{
    tree: TreeNode[]
    files: Map<string, string>
  }> {
    const files = new Map<string, string>()
    const pathSet: string[] = []

    const readPromises = Array.from(fileList)
      .filter(file => file.name.endsWith('.md'))
      .map(async (file) => {
        const path = file.webkitRelativePath || file.name
        const content = await file.text()
        files.set(path, content)
        pathSet.push(path)
      })

    await Promise.all(readPromises)

    pathSet.sort((a, b) => a.localeCompare(b))

    const tree = buildTree(pathSet)

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

        let existing = current.find(n => n.name === name && n.type === (isFile ? 'file' : 'folder'))

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

  return { parseFiles }
}
```

**Step 2: Verify dev server still runs**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add app/composables/useFileParser.ts
git commit -m "feat: add file parsing composable to build tree from uploaded files"
```

---

### Task 4: Markdown Renderer Composable

**Files:**
- Create: `app/composables/useMarkdownRenderer.ts`

**Step 1: Create the markdown renderer composable**

This initializes markdown-it with Shiki for syntax highlighting.

Create `app/composables/useMarkdownRenderer.ts`:

```typescript
import MarkdownIt from 'markdown-it'
import { createHighlighter } from 'shiki'

export function useMarkdownRenderer() {
  const md = ref<MarkdownIt | null>(null)
  const isReady = ref(false)

  async function init() {
    const highlighter = await createHighlighter({
      themes: ['vitesse-dark'],
      langs: [
        'javascript', 'typescript', 'python', 'bash', 'json',
        'html', 'css', 'markdown', 'yaml', 'sql', 'rust',
        'go', 'java', 'c', 'cpp', 'ruby', 'php', 'swift',
        'kotlin', 'shell', 'diff', 'dockerfile', 'toml', 'xml',
      ],
    })

    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight(code, lang) {
        try {
          const resolvedLang = lang || 'text'
          const loadedLangs = highlighter.getLoadedLanguages()
          if (loadedLangs.includes(resolvedLang as any)) {
            return highlighter.codeToHtml(code, {
              lang: resolvedLang,
              theme: 'vitesse-dark',
            })
          }
        } catch {}
        return `<pre class="shiki"><code>${instance.utils.escapeHtml(code)}</code></pre>`
      },
    })

    md.value = instance
    isReady.value = true
  }

  function render(content: string): string {
    if (!md.value) return ''
    return md.value.render(content)
  }

  return { init, render, isReady }
}
```

**Step 2: Verify dev server still runs**

Run: `npm run dev`
Expected: No errors.

**Step 3: Commit**

```bash
git add app/composables/useMarkdownRenderer.ts
git commit -m "feat: add markdown renderer composable with Shiki syntax highlighting"
```

---

### Task 5: UploadZone Component (Landing Page)

**Files:**
- Create: `app/components/UploadZone.vue`
- Modify: `app/pages/index.vue`

**Step 1: Create UploadZone component**

Create `app/components/UploadZone.vue`:

```vue
<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen p-8"
  >
    <div class="text-center mb-12">
      <h1 class="text-4xl font-light tracking-tight text-zinc-100 mb-2">
        MD Book Viewer
      </h1>
      <p class="text-zinc-500 text-sm">
        Upload a folder of markdown files to start reading
      </p>
    </div>

    <div
      :class="[
        'relative w-full max-w-lg border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 cursor-pointer',
        isDragging
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="openFilePicker"
    >
      <div class="space-y-4">
        <div class="text-4xl text-zinc-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p class="text-zinc-300 text-sm font-medium">
            Drop a folder here or click to browse
          </p>
          <p class="text-zinc-600 text-xs mt-1">
            Supports folders with .md files or single .md files
          </p>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        class="hidden"
        webkitdirectory
        multiple
        accept=".md"
        @change="handleFileInput"
      />
    </div>

    <p v-if="error" class="mt-4 text-red-400 text-sm">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  filesSelected: [files: FileList]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const error = ref('')

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    processFiles(input.files)
  }
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  error.value = ''

  const items = event.dataTransfer?.items
  if (!items) return

  const files: File[] = []

  async function traverseEntry(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      const file = await new Promise<File>((resolve) => fileEntry.file(resolve))
      if (file.name.endsWith('.md')) {
        files.push(file)
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const reader = dirEntry.createReader()
      const entries = await new Promise<FileSystemEntry[]>((resolve) =>
        reader.readEntries(resolve)
      )
      await Promise.all(entries.map(traverseEntry))
    }
  }

  const entries = Array.from(items)
    .map(item => item.webkitGetAsEntry())
    .filter(Boolean) as FileSystemEntry[]

  await Promise.all(entries.map(traverseEntry))

  if (files.length === 0) {
    error.value = 'No markdown files found'
    return
  }

  const dt = new DataTransfer()
  files.forEach(f => dt.items.add(f))
  emit('filesSelected', dt.files)
}

function processFiles(fileList: FileList) {
  error.value = ''
  const mdFiles = Array.from(fileList).filter(f => f.name.endsWith('.md'))
  if (mdFiles.length === 0) {
    error.value = 'No markdown files found'
    return
  }
  emit('filesSelected', fileList)
}
</script>
```

**Step 2: Update pages/index.vue**

```vue
<template>
  <div>
    <UploadZone v-if="!store.tree.length" @files-selected="handleFiles" />
    <div v-else class="text-zinc-400 p-8">
      Book loaded: {{ store.tree.length }} items
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBookStore } from '~/stores/book'
import { useFileParser } from '~/composables/useFileParser'

const store = useBookStore()
const { parseFiles } = useFileParser()

async function handleFiles(fileList: FileList) {
  const { tree, files } = await parseFiles(fileList)
  store.loadBook(tree, files)
  if (tree.length > 0) {
    const firstFile = findFirstFile(tree)
    if (firstFile) store.setActiveFile(firstFile.id)
  }
}

function findFirstFile(nodes: any[]): any {
  for (const node of nodes) {
    if (node.type === 'file') return node
    if (node.children) {
      const found = findFirstFile(node.children)
      if (found) return found
    }
  }
  return null
}
</script>
```

**Step 3: Test in browser**

Run: `npm run dev`
Expected: Dark landing page with upload zone. Uploading a folder of .md files transitions to "Book loaded" text.

**Step 4: Commit**

```bash
git add app/components/UploadZone.vue app/pages/index.vue
git commit -m "feat: add upload zone landing page with drag-and-drop support"
```

---

### Task 6: Sidebar and SidebarItem Components

**Files:**
- Create: `app/components/AppSidebar.vue`
- Create: `app/components/SidebarItem.vue`

**Step 1: Create SidebarItem (recursive tree node)**

Create `app/components/SidebarItem.vue`:

```vue
<template>
  <li>
    <button
      :class="[
        'flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors duration-150',
        isActive
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
      ]"
      @click="handleClick"
    >
      <span v-if="node.type === 'folder'" class="text-zinc-500 text-xs">
        {{ isOpen ? '&#9660;' : '&#9654;' }}
      </span>
      <span v-else class="text-zinc-600 text-xs pl-2">&#9679;</span>
      <span class="truncate">{{ displayName }}</span>
    </button>

    <ul
      v-if="node.type === 'folder' && isOpen && node.children"
      class="ml-3 border-l border-zinc-800 pl-2 mt-0.5"
    >
      <SidebarItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import type { TreeNode } from '~/types'
import { useBookStore } from '~/stores/book'

const props = defineProps<{
  node: TreeNode
}>()

const store = useBookStore()
const isOpen = ref(true)

const isActive = computed(() =>
  props.node.type === 'file' && store.activeFileId === props.node.id
)

const displayName = computed(() =>
  props.node.type === 'file'
    ? props.node.name.replace(/\.md$/, '')
    : props.node.name
)

function handleClick() {
  if (props.node.type === 'folder') {
    isOpen.value = !isOpen.value
  } else {
    store.setActiveFile(props.node.id)
  }
}
</script>
```

**Step 2: Create AppSidebar**

Create `app/components/AppSidebar.vue`:

```vue
<template>
  <aside
    :class="[
      'h-screen border-r border-zinc-800 bg-zinc-950 transition-all duration-300 flex flex-col',
      store.sidebarOpen ? 'w-72' : 'w-0 overflow-hidden',
    ]"
  >
    <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
      <h2 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        Contents
      </h2>
      <button
        class="text-zinc-500 hover:text-zinc-300 transition-colors"
        @click="store.reset()"
        title="Close book"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto p-3">
      <ul class="space-y-0.5">
        <SidebarItem
          v-for="node in store.tree"
          :key="node.id"
          :node="node"
        />
      </ul>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { useBookStore } from '~/stores/book'

const store = useBookStore()
</script>
```

**Step 3: Verify components render**

Run: `npm run dev`
Expected: No errors. (Components not yet wired into page layout — next task.)

**Step 4: Commit**

```bash
git add app/components/AppSidebar.vue app/components/SidebarItem.vue
git commit -m "feat: add collapsible sidebar with recursive tree navigation"
```

---

### Task 7: ContentViewer Component

**Files:**
- Create: `app/components/ContentViewer.vue`

**Step 1: Create ContentViewer**

Create `app/components/ContentViewer.vue`:

```vue
<template>
  <main class="flex-1 overflow-y-auto">
    <div v-if="!store.activeContent" class="flex items-center justify-center h-full">
      <p class="text-zinc-600 text-sm">Select a file from the sidebar</p>
    </div>
    <article
      v-else
      class="prose prose-invert prose-zinc max-w-3xl mx-auto px-8 py-12"
      v-html="renderedContent"
    />
  </main>
</template>

<script setup lang="ts">
import { useBookStore } from '~/stores/book'
import { useMarkdownRenderer } from '~/composables/useMarkdownRenderer'

const store = useBookStore()
const { init, render, isReady } = useMarkdownRenderer()

onMounted(() => init())

const renderedContent = computed(() => {
  if (!isReady.value || !store.activeContent) return ''
  return render(store.activeContent)
})
</script>
```

**Step 2: Commit**

```bash
git add app/components/ContentViewer.vue
git commit -m "feat: add content viewer with markdown rendering and syntax highlighting"
```

---

### Task 8: Wire Up Reader Layout in index.vue

**Files:**
- Modify: `app/pages/index.vue`

**Step 1: Update index.vue with full layout**

Replace `app/pages/index.vue`:

```vue
<template>
  <div>
    <UploadZone v-if="!store.tree.length" @files-selected="handleFiles" />

    <div v-else class="flex h-screen">
      <AppSidebar />

      <div class="flex-1 flex flex-col min-w-0">
        <header class="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 shrink-0">
          <button
            class="text-zinc-500 hover:text-zinc-300 transition-colors"
            @click="store.toggleSidebar()"
            title="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span class="text-sm text-zinc-400 truncate">
            {{ activeFileName }}
          </span>
        </header>

        <ContentViewer />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '~/types'
import { useBookStore } from '~/stores/book'
import { useFileParser } from '~/composables/useFileParser'

const store = useBookStore()
const { parseFiles } = useFileParser()

const activeFileName = computed(() => {
  if (!store.activeFileId) return ''
  const parts = store.activeFileId.split('/')
  return parts[parts.length - 1].replace(/\.md$/, '')
})

async function handleFiles(fileList: FileList) {
  const { tree, files } = await parseFiles(fileList)
  store.loadBook(tree, files)
  const firstFile = findFirstFile(tree)
  if (firstFile) store.setActiveFile(firstFile.id)
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
</script>
```

**Step 2: Add Tailwind typography plugin**

Run: `npm install @tailwindcss/typography`

Then update the tailwindcss config in `nuxt.config.ts` to include the plugin:

```typescript
tailwindcss: {
  config: {
    darkMode: 'class',
    plugins: [require('@tailwindcss/typography')],
  },
},
```

**Step 3: Test full flow in browser**

Run: `npm run dev`
Expected:
1. Landing page with upload zone appears
2. Upload a folder of .md files
3. Sidebar shows tree structure with collapsible folders
4. Clicking a file renders markdown with syntax-highlighted code
5. Sidebar toggle button works
6. Close button resets to upload screen

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire up complete reader layout with sidebar, content viewer, and header"
```

---

### Task 9: Tailwind Typography and Global Styles

**Files:**
- Create: `app/assets/css/main.css`
- Modify: `nuxt.config.ts`

**Step 1: Create global stylesheet**

Create `app/assets/css/main.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #3f3f46;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #52525b;
}

/* Shiki code blocks styling */
.prose pre {
  @apply rounded-xl border border-zinc-800 !bg-zinc-900;
}

.prose code:not(pre code) {
  @apply bg-zinc-800 px-1.5 py-0.5 rounded text-sm text-zinc-200 before:content-none after:content-none;
}

/* Smooth content transitions */
.prose {
  @apply leading-relaxed;
}
```

**Step 2: Add CSS to nuxt config**

Add to `nuxt.config.ts`:
```typescript
css: ['~/assets/css/main.css'],
```

**Step 3: Test styling**

Run: `npm run dev`
Expected: Custom scrollbars, styled code blocks, clean typography.

**Step 4: Commit**

```bash
git add app/assets/css/main.css nuxt.config.ts
git commit -m "feat: add global styles with custom scrollbar and code block styling"
```

---

### Task 10: Test with Playwright MCP and Fix Issues

**Step 1: Start dev server**

Run: `npm run dev` (keep running)

**Step 2: Use Playwright MCP to navigate to the app**

Navigate to `http://localhost:3000` and take a snapshot. Verify:
- Dark background renders correctly
- Upload zone is visible and centered
- No console errors

**Step 3: Test file upload flow**

Create test markdown files, upload them via the UI, and verify:
- Sidebar tree renders
- Files are clickable
- Markdown renders with syntax highlighting
- Sidebar collapses/expands
- Close button returns to upload screen

**Step 4: Fix any issues found**

Debug and fix any rendering, layout, or functionality issues discovered during testing.

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve issues found during Playwright testing"
```
