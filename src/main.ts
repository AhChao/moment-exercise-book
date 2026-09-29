import { createApp } from 'vue'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/paper.css'
import App from './App.vue'
import { router } from './router'
import { initInstall } from '@/ui/useInstall'

// Capture the install prompt before any screen is opened.
initInstall()

createApp(App).use(router).mount('#app')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is optional */
    })
  })
}
