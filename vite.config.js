import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // 5MB
      },
      manifest: {
        name: 'Cetelio',
        short_name: 'Cetelio',
        description: 'Cetelio - Sistema de Gestión',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://rincon-manager.vercel.app',
        changeOrigin: true
      }
    }
  }
})