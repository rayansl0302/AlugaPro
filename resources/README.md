# Resources for Capacitor

## Arquivos de marca

- `logo.png` — ícone (casa + predinho + check), ≥1024px, fundo transparente
- `splash.png` / `splash-dark.png` — splash full-bleed com **logo completa**
  (ícone + “AlugaPro” + tagline), geradas por `node scripts/generate-splash.mjs`
- `splash-icon.png` — ícone denso para a Splash Screen API do Android 12+

## Regenerar splash + ícones (Android)

```bash
# 1. Monta splash com a logo completa (public/logo-completa-alugapro.png)
node scripts/generate-splash.mjs

# 2. Gera densidades Android
npx capacitor-assets generate --assetPath resources --iconBackgroundColor '#FFFFFF' --splashBackgroundColor '#E8F0FA' --android

# 3. Copia o ícone da splash Android 12+ (se o generate não o incluir)
cp resources/splash-icon.png android/app/src/main/res/drawable/splash_icon.png

# 4. Build + sync
npm run build:android
```

Fundo da splash: **branco puro** (`#FFFFFF`) com a logo completa centralizada.
`SplashScreen.backgroundColor` e `windowSplashScreenBackground` ficam em `#FFFFFF`.
