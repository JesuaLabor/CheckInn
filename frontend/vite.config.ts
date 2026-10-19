import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icons/*.png',
        'icons/*.svg'
      ],
      manifest: {
        name: 'LocalStay — Boutique Hotels & Inns Booking',
        short_name: 'LocalStay',
        id: 'com.localstay.app',
        description: 'Marketplace-style digital booking and front-desk platform for boutique hotels, independent inns, and heritage lodgings.',
        categories: ['travel', 'lifestyle', 'business'],
        theme_color: '#1E3A2B',
        background_color: '#FAF8F5',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Browse Inns',
            short_name: 'Marketplace',
            description: 'Explore available rooms across the Philippines and abroad',
            url: '/',
            icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'My Bookings',
            short_name: 'Bookings',
            description: 'View active reservations & QR check-in passes',
            url: '/?tab=guest_bookings',
            icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Staff Front Desk',
            short_name: 'Front Desk',
            description: 'Pending requests, room board & check-in scanner',
            url: '/?tab=staff_dashboard',
            icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'hotel-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/v1\/inns\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-inns-cache',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8008',
        changeOrigin: true
      },
      '/media': {
        target: 'http://127.0.0.1:8008',
        changeOrigin: true
      }
    }
  }
})

