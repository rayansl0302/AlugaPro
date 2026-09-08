import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

function readAndroidVersion(): { code: string; name: string } {
  try {
    const gradle = fs.readFileSync(path.resolve(__dirname, 'android/app/build.gradle'), 'utf8')
    const code = gradle.match(/versionCode\s+(\d+)/)?.[1] ?? '0'
    const name = gradle.match(/versionName\s+"([^"]+)"/)?.[1] ?? '0.0.0'
    return { code, name }
  } catch {
    return { code: '0', name: '0.0.0' }
  }
}

const androidVersion = readAndroidVersion()

export default defineConfig({
  define: {
    __APP_VERSION_NAME__: JSON.stringify(androidVersion.name),
    __APP_VERSION_CODE__: JSON.stringify(androidVersion.code),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registro manual em main.tsx: dentro do app nativo (Capacitor) o SW
      // não deve rodar — os assets já vêm empacotados no APK/IPA e o cache
      // do Workbox serviria bundle antigo depois de atualizar o app.
      injectRegister: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'AlugaPro - Gestão de Aluguéis',
        short_name: 'AlugaPro',
        description: 'Sistema de Gestão de Aluguéis e Imóveis',
        theme_color: '#032B61',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
