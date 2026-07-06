# Resources for Capacitor

Modo usado neste projeto: **Easy Mode** (um único arquivo de logo + cor de fundo).

- `logo.png` — pelo menos 1024x1024px, PNG com fundo transparente (a marca AlugaPro,
  gerado a partir de `public/android-chrome-512x512.png`)

## Gerar/regenerar os ícones e splash (Android):
```bash
npx capacitor-assets generate --assetPath resources --iconBackgroundColor '#FFFFFF' --splashBackgroundColor '#FFFFFF' --android
```

Fundo branco (`#FFFFFF`) foi escolhido de propósito: o ícone tem a casinha em
navy (`#032B61`), a mesma cor de fundo usada antes no splash — colocando o
logo num fundo navy a casa ficava quase invisível (baixo contraste). Se trocar
a logo por uma versão com bom contraste em navy, pode voltar a usar navy como
`--iconBackgroundColor`/`--splashBackgroundColor` (e reverter
`SplashScreen.backgroundColor` em `capacitor.config.ts` junto).

O Capacitor Assets gera automaticamente todos os tamanhos necessários
para Android (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi), incluindo variante
dark mode do splash (`drawable-night`).

Depois de gerar, rode `npm run build:android` pra sincronizar e reabra o
Android Studio pra rebuildar o APK.
