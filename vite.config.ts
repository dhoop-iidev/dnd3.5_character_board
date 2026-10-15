import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Relative paths: the same build works on GitHub Pages (/<repo>/) and locally.
  base: './',
  plugins: [
    svelte(),
    // Installable, offline-capable app for the tablet: everything is precached on first visit.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['OGL.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Plateau D&D 3.5',
        short_name: 'Plateau D&D',
        description: 'Fiche de personnage D&D 3.5 interactive / interactive D&D 3.5 character sheet',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#fbfaf7',
        theme_color: '#1a1714',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,webp,png,svg,txt}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
