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
        'tsx', 'jsx', 'vue', 'svelte', 'scss', 'less',
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
        }
        catch {}
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
