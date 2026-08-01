// Pré-renderização das páginas públicas de marketing/legal pra HTML estático.
//
// O AlugaPro é uma SPA 100% client-side (Vite + React, sem SSR). Isso significa
// que qualquer coisa renderizada via React só existe depois do JS rodar no
// navegador — ótimo pra Google/Bing (que executam JS), mas invisível pra
// crawlers que não executam JS (a maioria dos usados por ferramentas de IA
// generativa: GPTBot, ClaudeBot, PerplexityBot, etc.).
//
// Este script roda depois do `vite build` e gera HTML estático real (com
// título, meta tags e JSON-LD já embutidos) só pras páginas públicas de
// conteúdo — a app autenticada continua 100% client-side como sempre foi.
// O client (`src/main.tsx`) usa `createRoot` (não `hydrateRoot`), então o
// React descarta esse HTML e re-renderiza do zero assim que o JS carrega no
// navegador — sem hydration mismatch, sem efeito colateral pro usuário real.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToString } from 'react-dom/server'
import * as HelmetNS from 'react-helmet-async'
import type { HelmetServerState } from 'react-helmet-async'

// tsx/Node às vezes resolve este pacote pelo build CJS (cjs-module-lexer não
// detecta os named exports do bundle esbuild) e expõe tudo só em `.default`
// — este fallback funciona nos dois casos.
const { HelmetProvider } = ((HelmetNS as unknown as { default?: typeof HelmetNS }).default ?? HelmetNS)
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../src/contexts/authContextCore'
import { LandingPage } from '../src/modules/landing/LandingPage'
import { RecursosPage } from '../src/modules/landing/RecursosPage'
import { AfiliadosPage } from '../src/modules/landing/AfiliadosPage'
import { TermsPage } from '../src/modules/legal/TermsPage'
import { PrivacyPolicyPage } from '../src/modules/legal/PrivacyPolicyPage'

import ptLanding from '../src/i18n/locales/pt-BR/landing.json'
import ptLegal from '../src/i18n/locales/pt-BR/legal.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')

// Instância de i18n isolada, só com o necessário pras páginas prerenderizadas
// — evita importar src/i18n/index.ts real, que usa i18next-browser-languagedetector
// (acessa localStorage/navigator, que não existem em Node puro).
const i18n = i18next.createInstance()
void i18n.use(initReactI18next).init({
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  resources: {
    'pt-BR': { landing: ptLanding, legal: ptLegal },
  },
  ns: ['landing', 'legal'],
  defaultNS: 'landing',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

// Stub de autenticação: um crawler nunca está logado, então user: null é
// semanticamente correto, não só uma gambiarra pra evitar chamar Firebase
// (que exigiria window/indexedDB, inexistentes em Node puro) neste script.
const authStub: AuthContextValue = {
  firebaseUser: null,
  user: null,
  loading: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateLocalUser: () => {},
  refreshProfile: async () => {},
  setLocale: async () => {},
}

interface PageConfig {
  routePath: string
  outFile: string
  Component: React.ComponentType
}

const pages: PageConfig[] = [
  { routePath: '/', outFile: 'index.html', Component: LandingPage },
  { routePath: '/recursos', outFile: 'recursos/index.html', Component: RecursosPage },
  { routePath: '/afiliados', outFile: 'afiliados/index.html', Component: AfiliadosPage },
  { routePath: '/termos', outFile: 'termos/index.html', Component: TermsPage },
  { routePath: '/politica-de-privacidade', outFile: 'politica-de-privacidade/index.html', Component: PrivacyPolicyPage },
]

const baseHtml = readFileSync(path.join(distDir, 'index.html'), 'utf-8')
const SEO_DEFAULT_BLOCK = /<!-- SEO:DEFAULT:START[\s\S]*?SEO:DEFAULT:END -->/

let generated = 0

for (const page of pages) {
  const helmetContext: { helmet?: HelmetServerState } = {}

  const app = React.createElement(
    HelmetProvider,
    { context: helmetContext },
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(
        MemoryRouter,
        { initialEntries: [page.routePath] },
        React.createElement(
          AuthContext.Provider,
          { value: authStub },
          React.createElement(page.Component),
        ),
      ),
    ),
  )

  let bodyHtml: string
  try {
    bodyHtml = renderToString(app)
  } catch (err) {
    console.error(`[prerender] falhou ao renderizar ${page.routePath}, pulando (o build continua):`, err)
    continue
  }

  const { helmet } = helmetContext
  const headTags = helmet
    ? [helmet.title.toString(), helmet.meta.toString(), helmet.link.toString(), helmet.script.toString()].join('\n')
    : ''

  const html = baseHtml
    .replace(SEO_DEFAULT_BLOCK, headTags)
    .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)

  const outPath = path.join(distDir, page.outFile)
  mkdirSync(path.dirname(outPath), { recursive: true })
  writeFileSync(outPath, html, 'utf-8')
  generated++
  console.log(`[prerender] gerado dist/${page.outFile}`)
}

console.log(`[prerender] ${generated}/${pages.length} páginas pré-renderizadas.`)
