import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { toast } from './stores/toastStore'

// Expose toast on window for interactive triggers and console access
(window as any).toast = toast;

// Register PWA service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[LocalStay PWA] New update available.')
  },
  onOfflineReady() {
    console.log('[LocalStay PWA] Content cached for offline use.')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

