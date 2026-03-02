<template>
  <li>
    <div :class="node.type === 'folder' ? 'group/folder flex items-center' : 'flex items-center'">
      <button
        :class="[
          'flex items-center gap-2 flex-1 min-w-0 text-left px-3 py-1.5 rounded-lg text-[13px] font-display transition-all duration-150',
          isActive
            ? 'bg-ink-800 text-amber-warm'
            : node.type === 'folder'
              ? 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/40'
              : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/40',
        ]"
        @click="handleClick"
      >
        <!-- Folder chevron -->
        <span
          v-if="node.type === 'folder'"
          :class="[
            'transition-transform duration-200 text-[10px] text-ink-600',
            isOpen ? 'rotate-90' : '',
          ]"
        >
          &#9654;
        </span>

        <!-- File dot -->
        <span
          v-else
          :class="[
            'w-1 h-1 rounded-full shrink-0 ml-1',
            isActive ? 'bg-amber-warm' : 'bg-ink-700',
          ]"
        />

        <span class="truncate">{{ displayName }}</span>
      </button>

      <!-- Remove folder button — visible on hover -->
      <button
        v-if="node.type === 'folder'"
        class="opacity-0 group-hover/folder:opacity-100 text-ink-600 hover:text-ink-300 transition-all p-1 rounded-md hover:bg-ink-800/40 shrink-0 mr-1"
        title="Remove folder"
        @click.stop="store.removeFolder(node.id)"
      >
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Children -->
    <Transition name="slide">
      <ul
        v-if="node.type === 'folder' && isOpen && node.children?.length"
        class="ml-3 border-l border-ink-800/60 pl-1.5 mt-0.5 space-y-0.5"
      >
        <SidebarItem
          v-for="child in node.children"
          :key="child.id"
          :node="child"
        />
      </ul>
    </Transition>
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

const isActive = computed(
  () => props.node.type === 'file' && store.activeFileId === props.node.id,
)

const displayName = computed(() =>
  props.node.type === 'file'
    ? props.node.name.replace(/\.md$/, '')
    : props.node.name,
)

function handleClick() {
  if (props.node.type === 'folder') {
    isOpen.value = !isOpen.value
  }
  else {
    store.setActiveFile(props.node.id)
  }
}
</script>
