// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: process.env.NODE_ENV === 'development' },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Dokrr',
      htmlAttrs: { class: 'dark' },
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,300;1,6..72,400;1,6..72,500&family=Sora:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
        },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'description', content: 'A distraction-free reader for markdown documents' },
        { name: 'theme-color', content: '#0a0a0b' },
        { property: 'og:title', content: 'Dokrr' },
        { property: 'og:description', content: 'A distraction-free reader for markdown documents' },
        { property: 'og:type', content: 'website' },
      ],
    },
  },
})
