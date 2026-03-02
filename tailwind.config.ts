import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0a0a0b',
          900: '#111113',
          850: '#161619',
          800: '#1c1c20',
          700: '#27272c',
          600: '#3a3a42',
          500: '#55555f',
          400: '#78788a',
          300: '#a0a0b0',
          200: '#c8c8d4',
          100: '#e8e8ee',
        },
        amber: {
          warm: '#e8a040',
          glow: '#f0b860',
          soft: '#d4944a',
          muted: '#b07830',
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config
