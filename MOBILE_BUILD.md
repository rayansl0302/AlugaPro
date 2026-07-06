# AlugaPro — Guia de Build Mobile

## Fluxo padrão (a cada atualização do app)

```bash
npm run build:mobile   # build web + sync Android e iOS
```

---

## Android (Google Play)

### Pré-requisitos
- [Android Studio](https://developer.android.com/studio) instalado

### Abrir no Android Studio
```bash
npm run open:android
```

### Gerar APK de Debug (para testar no celular)
No Android Studio:
1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. O APK fica em: `android/app/build/outputs/apk/debug/app-debug.apk`
3. Transfira para o celular e instale (precisa habilitar "Fontes desconhecidas")

### Gerar AAB para Google Play (produção)
No Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Escolha **Android App Bundle (.aab)**
3. Crie ou use uma keystore existente — **GUARDE A KEYSTORE COM SEGURANÇA, nunca perca**
4. Preencha: Key alias, Key password, Store password
5. Build type: **release**
6. O AAB fica em: `android/app/build/outputs/bundle/release/app-release.aab`
7. Envie esse arquivo para o [Google Play Console](https://play.google.com/console)

### Atualizar versão
Edite `android/app/build.gradle`:
```gradle
versionCode 2       # incrementar a cada upload
versionName "1.1"   # versão exibida na loja
```

---

## iOS (App Store) — Executar no MacBook

### Pré-requisitos no Mac
- Xcode 15+ instalado (App Store)
- CocoaPods: `sudo gem install cocoapods`
- Conta Apple Developer ($99/ano)

### Setup inicial no Mac (apenas uma vez)
```bash
git clone <repo> alugapro
cd alugapro
npm install
cd ios/App
pod install     # instala dependências nativas iOS
cd ../..
```

### Abrir no Xcode
```bash
npm run open:ios
# ou manualmente: abra ios/App/App.xcworkspace (NÃO o .xcodeproj)
```

### Configurar no Xcode
1. Selecione o target **App** no painel esquerdo
2. **Signing & Capabilities** → selecione seu Apple Developer Team
3. Bundle Identifier: `com.alugapro.app`
4. Versão e Build number

### Gerar IPA para App Store
1. Selecione destino: **Any iOS Device (arm64)**
2. **Product → Archive**
3. No Organizer: **Distribute App → App Store Connect**
4. Siga o assistente → upload direto para App Store Connect

### Atualizar web no iOS após mudanças
```bash
npm run build:ios   # no Windows, faz build + sync
git push            # no Mac: git pull && npx cap sync ios
```

---

## Ícones e Splash Screen

Já gerados a partir da logo real do AlugaPro (`resources/logo.png`, fundo branco).
Pra regenerar depois de trocar a logo, veja [resources/README.md](resources/README.md):
```bash
npx capacitor-assets generate --assetPath resources --iconBackgroundColor '#FFFFFF' --splashBackgroundColor '#FFFFFF' --android
npm run build:mobile
```

---

## Estrutura do projeto mobile

```
android/          → Projeto Android Studio (commit no git)
ios/              → Projeto Xcode (commit no git)
capacitor.config.ts  → Configuração central do Capacitor
resources/        → Ícones e splash originais
```

---

## Checklist para publicação

### Google Play
- [ ] AAB gerado com keystore de produção
- [ ] Ícone 512×512 enviado na loja
- [ ] Screenshots do app (mínimo 2)
- [ ] Descrição em português
- [ ] Política de privacidade (obrigatório)
- [ ] versionCode incrementado

### App Store
- [ ] Archive gerado sem erros
- [ ] Certificados e provisioning profiles configurados
- [ ] Screenshots para iPhone e iPad
- [ ] Descrição em português
- [ ] Política de privacidade (obrigatório)
- [ ] Número de build incrementado
