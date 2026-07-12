# AlugaPro — Guia de Build Mobile

## ⚠️ Antes de QUALQUER build: o arquivo `.env`

O Vite grava as credenciais do Firebase **dentro do bundle** na hora do build.
Sem um `.env` na raiz com as chaves `VITE_FIREBASE_*` preenchidas, o app compila
mas abre em **tela branca** no celular (`auth/invalid-api-key`). Confira que o
`.env` existe (base: `.env.example`) antes de rodar qualquer `npm run build:*`.

## Fluxo padrão (a cada atualização do app)

```bash
npm run build:mobile   # build web + sync Android e iOS
```

---

## Android (Google Play)

### Pré-requisitos
- [Android Studio](https://developer.android.com/studio) instalado
- `android/app/google-services.json` presente (baixado do Firebase Console —
  app Android `com.alugapro.app`). Sem ele o login Google nativo não funciona.
- SHA-1 do keystore registrado no Firebase (Configurações do projeto → app
  Android → Adicionar impressão digital). O SHA-1 de **debug** e o de **release**
  são diferentes — registre os dois, senão o login Google falha no build release.
  ```bash
  # SHA-1 do keystore de release:
  "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
    -list -v -keystore alugapro-keystore/alugapro-release.jks -alias alugapro
  ```

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
3. Use a keystore existente: `alugapro-keystore/alugapro-release.jks`, alias `alugapro`
   — **GUARDE A KEYSTORE E AS SENHAS COM SEGURANÇA, nunca perca** (sem ela não
   dá pra atualizar o app publicado). Ela está no `.gitignore` e NÃO vai pro git;
   mantenha backup fora do projeto (gerenciador de senhas / drive pessoal).
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
- Xcode 15+ instalado (App Store) — só as Command Line Tools NÃO bastam
- CocoaPods: `sudo gem install cocoapods`
- Conta Apple Developer ($99/ano)

### Pendências específicas do AlugaPro no iOS (fazer antes do primeiro build)
1. Registrar o app iOS (`com.alugapro.app`) no Firebase Console e baixar o
   `GoogleService-Info.plist` → colocar em `ios/App/App/`.
2. Copiar o `CLIENT_ID` desse plist para `GOOGLE_IOS_CLIENT_ID` em
   `src/contexts/AuthContext.tsx` (sem isso o botão "Entrar com Google" no iOS
   falha com mensagem explicativa).
3. Adicionar o URL scheme reverso (`REVERSED_CLIENT_ID` do plist) no
   `ios/App/App/Info.plist`, conforme docs do `@capgo/capacitor-social-login`.

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
