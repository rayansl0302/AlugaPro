import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { Providers } from '@/app/providers'
import { AppRouter } from '@/app/Router'
import '@/styles/globals.css'

// Service worker do PWA só na web — no app nativo os assets já vêm no
// APK/IPA e o cache do Workbox serviria bundle antigo após atualizações.
if (!Capacitor.isNativePlatform() && !import.meta.env.DEV) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </React.StrictMode>
)
