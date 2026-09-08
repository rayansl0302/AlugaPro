# AlugaPro

Plataforma SaaS multi-tenant para **gestão de aluguéis** de imóveis, veículos e equipamentos — com contratos digitais, assinatura eletrônica, cobranças, portal do inquilino e app mobile (Android/iOS via Capacitor).

**Site:** [https://alugapro.tech.br](https://alugapro.tech.br)  
**Package Android:** `com.alugapro.app`  
**Suporte / privacidade:** suporte@alugapro.com.br

---

## Índice rápido (Google Play Console)

Use esta seção como fonte para preencher o formulário da Play Console. Detalhes técnicos do projeto ficam mais abaixo.

| Formulário / declaração | Onde responder neste README |
|-------------------------|-----------------------------|
| Identidade do app | [Identidade do app](#identidade-do-app-play-store) |
| Descrição curta / completa | [Textos sugeridos para a loja](#textos-sugeridos-para-a-loja) |
| Público-alvo e conteúdo | [Público-alvo e classificação](#público-alvo-e-classificação) |
| Segurança dos dados (Data safety) | [Segurança dos dados](#segurança-dos-dados-data-safety) |
| Exclusão de conta | [Exclusão de conta](#exclusão-de-conta-obrigatório-play) |
| Permissões | [Permissões Android](#permissões-android-e-justificativa) |
| Anúncios / Advertising ID | [Anúncios e Advertising ID](#anúncios-e-advertising-id) |
| Recursos financeiros | [Recursos financeiros](#recursos-financeiros) |
| Login e autenticação | [Login e autenticação](#login-e-autenticação) |
| SDKs e terceiros | [SDKs e compartilhamento](#sdks-e-compartilhamento-com-terceiros) |
| Links legais | [Links legais oficiais](#links-legais-oficiais) |

---

## Identidade do app (Play Store)

| Campo | Valor |
|-------|--------|
| Nome do app | AlugaPro |
| Application ID | `com.alugapro.app` |
| Categoria sugerida | **Negócios** (Business) — ferramenta B2B/B2C de gestão de locações |
| Tags / palavras-chave | gestão de aluguel, contratos digitais, imóveis, veículos, equipamentos, portal do inquilino |
| Idioma principal | Português (Brasil) — também EN e ES no app |
| Países / foco | Brasil |
| Contato de suporte | suporte@alugapro.com.br |
| Site | https://alugapro.tech.br |
| Versão atual (Android) | `versionName` **1.0** / `versionCode` **1** (conferir `android/app/build.gradle` antes de publicar) |
| minSdk / targetSdk | 23 / 36 |

**O que o app é (1 frase para a Console):**  
Aplicativo de gestão profissional de locações (imóveis, veículos e equipamentos), com contratos digitais, cobranças, assinatura eletrônica e portal do inquilino.

**O que o app NÃO é:**  
Não é rede social, jogo, app infantil, corretora de valores, carteira de criptomoedas, app de governo, nem app de conteúdo adulto.

---

## Textos sugeridos para a loja

### Descrição curta (≤ 80 caracteres)

```
Gestão de aluguéis: contratos, cobranças e portal do inquilino.
```

### Descrição completa (sugestão)

```
O AlugaPro é a plataforma completa para gestores e administradoras de locação.

Organize imóveis, veículos e equipamentos, gere contratos digitais com assinatura eletrônica, controle cobranças e inadimplência, e ofereça um portal para o inquilino acompanhar contratos e enviar comprovantes.

Principais recursos:
• Cadastro de bens, inquilinos e proprietários
• Contratos digitais e assinatura eletrônica (incluindo testemunhas)
• Cobranças, comprovantes e acompanhamento financeiro
• Manutenção, advertências e notificações
• Portal do inquilino
• Login com e-mail ou Google

Público: profissionais e empresas de locação e seus inquilinos. Uso destinado a maiores de 18 anos.
```

---

## Público-alvo e classificação

| Pergunta típica da Console | Resposta sugerida |
|----------------------------|-------------------|
| Público-alvo principal | Adultos **18+** (gestores de locação, administradoras, inquilinos, afiliados) |
| App direcionado a crianças? | **Não** |
| Coleta dados de crianças? | **Não** — política declara que a plataforma não é destinada a menores de 18 anos |
| Conteúdo sexual / nudez | **Não** |
| Violência / armas | **Não** (app de gestão empresarial) |
| Linguagem ofensiva | **Não** |
| Drogas / álcool / tabaco (promoção) | **Não** |
| Jogos de azar | **Não** |
| Conteúdo gerado por usuário aberto ao público? | **Não** — conteúdo fica no escopo da empresa (multi-tenant); não é feed público |
| Contato entre usuários | Comunicação operacional (ex.: notificações, contratos, chamados de manutenção) no contexto da locação; **não** é chat social aberto |
| Compras no app / assinatura digital | Assinatura do SaaS via **Asaas** (checkout externo no navegador), não via Google Play Billing — ver [Recursos financeiros](#recursos-financeiros) |

**IARC / questionário de classificação:** responder como app de **negócios / produtividade**, sem conteúdo sensível listado acima.

---

## Segurança dos dados (Data safety)

Resumo alinhado à [Política de Privacidade](https://alugapro.tech.br/politica-de-privacidade) (atualizada em 25/06/2026 no produto).

### Declarações gerais

| Pergunta | Resposta |
|----------|----------|
| O app coleta ou compartilha dados do usuário? | **Sim** — coleta para operar o serviço |
| Os dados são criptografados em trânsito? | **Sim** (HTTPS / TLS) |
| Os usuários podem solicitar exclusão de dados? | **Sim** — ver seção de exclusão de conta |
| Você vende dados pessoais? | **Não** |
| Dados usados para publicidade / remarketing de terceiros? | **Não** (cookies/armazenamento local apenas essenciais; sem cookies de rastreamento publicitário de terceiros) |
| Dados usados para fraud prevention / segurança? | **Sim** (ex.: KYC de afiliados, logs, autenticação) |
| Dados usados para funcionalidade do app? | **Sim** |
| Conta obrigatória? | **Sim** — o app nativo abre em login; recursos principais exigem autenticação |

### Dados coletados (mapear no formulário Data safety)

| Categoria Play Console | Exemplos no AlugaPro | Coletado? | Obrigatório / opcional | Finalidade principal |
|------------------------|----------------------|-----------|------------------------|----------------------|
| **Nome** | Nome completo | Sim | Necessário ao cadastro / contratos | Funcionalidade do app |
| **Endereço de e-mail** | Login e contato | Sim | Necessário | Conta, comunicação |
| **IDs do usuário** | UID Firebase, papel (`admin`/`gestor`/`inquilino`/`afiliado`) | Sim | Necessário | Conta e permissões |
| **Número de telefone** | Cadastro, WhatsApp, verificação | Sim | Conforme fluxo | Contato / verificação |
| **Endereço físico** | Endereço de pessoas e imóveis | Sim | Conforme cadastro | Contratos e gestão |
| **Outras informações pessoais** | CPF, CNPJ, RG, CNH | Sim | Conforme perfil/contrato | Identificação, contratos, cobrança SaaS |
| **Info financeira** | Valores de aluguel, cobranças, comprovantes; CPF/CNPJ para assinatura Asaas; chave PIX (afiliados) | Sim | Conforme uso | Gestão financeira e pagamentos |
| **Fotos** | Foto de perfil, fotos de bens, comprovantes, docs de identidade (frente/verso/segurando doc) | Sim | Conforme fluxo | Contratos, KYC afiliado, comprovantes |
| **Arquivos e docs** | PDFs de contrato, uploads | Sim | Conforme uso | Contratos e documentos |
| **Histórico de compras no app** | Assinatura do plano SaaS (via Asaas) | Sim (no backend) | Se assinar plano | Assinatura do serviço |
| **IDs do dispositivo** | Tokens FCM / identificadores técnicos | Sim (quando push/logs) | Técnico | Notificações / segurança |
| **Dados de diagnóstico** | Logs de acesso, IP | Sim | Técnico | Segurança e suporte |
| **Localização aproximada ou precisa** | — | **Não** (sem permissão de GPS no manifesto) |
| **Áudio / microfone** | — | **Não** |
| **Contatos da agenda** | — | **Não** |
| **Histórico de navegação na web** | — | **Não** |
| **Mensagens SMS** | — | **Não** (WhatsApp via Evolution API no servidor, não lê SMS do aparelho) |

### Compartilhamento com terceiros

Dados podem ser processados por provedores **necessários à operação** (não há venda de dados):

- **Firebase / Google** — autenticação, banco (Firestore), storage, push (FCM), login Google  
- **Asaas** — checkout e cobrança da assinatura SaaS  
- **Cloudflare R2** (e Cloudinary legado) — arquivos  
- **Resend / EmailJS** — e-mails  
- **Evolution API (WhatsApp)** — mensagens operacionais quando habilitado  
- **Vercel** — hospedagem web/API  

No Data safety: marcar como **compartilhamento com provedores de serviço** / processamento, **não** como venda.

### Retenção (resumo para a Console)

- Dados mantidos pelo tempo necessário às finalidades, obrigações legais e disputas.  
- Após exclusão de conta: dados pessoais de perfil são removidos; contratos/cobranças/comprovantes podem ser retidos até **5 anos** por obrigação legal/fiscal, só para essas finalidades.

---

## Exclusão de conta (obrigatório Play)

| Item | Valor |
|------|--------|
| URL pública de exclusão | https://alugapro.tech.br/exclusao-de-conta |
| Método | E-mail para **suporte@alugapro.com.br** (assunto: “Exclusão de conta”), a partir do e-mail cadastrado |
| Informar no pedido | Nome completo, e-mail de login, perfil (gestor / inquilino / afiliado) |
| Prazo | Até **15 dias úteis** após confirmação |
| O que é apagado | Nome, CPF, e-mail, telefone, endereço, fotos, documentos, credenciais, preferências |
| O que pode permanecer | Contratos, cobranças e comprovantes por obrigação legal (até 5 anos) |

A Play Console exige link **in-app ou web** acessível sem precisar publicar um APK novo só para isso — esta URL atende.

---

## Permissões Android e justificativa

Declaradas em `android/app/src/main/AndroidManifest.xml`:

| Permissão | Usada? | Justificativa para a Console / política de permissões |
|-----------|--------|------------------------------------------------------|
| `INTERNET` | Sim | Login, sync Firestore, uploads, APIs |
| `CAMERA` | Sim | Captura de fotos de documentos (assinatura/KYC), bens e comprovantes |
| `READ_MEDIA_IMAGES` | Sim | Selecionar imagens da galeria (docs, fotos de imóveis/veículos, comprovantes) |
| `READ_EXTERNAL_STORAGE` (até API 32) | Sim | Compatibilidade de leitura de imagens em Android mais antigo |
| `WRITE_EXTERNAL_STORAGE` (até API 29) | Sim | Compatibilidade legada (ex.: salvar/compartilhar arquivos) |
| Localização (`ACCESS_*_LOCATION`) | **Não** | — |
| Microfone | **Não** | — |
| Contatos / SMS / Telefone | **Não** | — |
| `AD_ID` / Advertising ID | **Não declarado / não usado para anúncios** | Ver seção de anúncios |

**Plugins Capacitor relevantes:** Filesystem + Share (salvar/compartilhar PDF/arquivo); Social Login (Google); Splash / StatusBar.

**Câmera / fotos:** uso **funcional** (contratos, identidade, comprovantes, cadastro de bens) — **não** para redes sociais nem anúncios.

---

## Anúncios e Advertising ID

| Pergunta | Resposta |
|----------|----------|
| O app contém anúncios? | **Não** |
| Usa Advertising ID (GAID) para anúncios? | **Não** |
| Família / Designed for Families? | **Não** (público 18+) |

Se a Console perguntar sobre declaração de Advertising ID: indicar que o app **não usa** o ID de publicidade para fins publicitários.

---

## Recursos financeiros

| Pergunta típica | Resposta sugerida |
|-----------------|-------------------|
| O app permite transferir dinheiro? | **Não** como carteira P2P. Há **comissão de afiliados via PIX** (pagamento operacional fora do fluxo de carteira do usuário final) e **assinatura SaaS** via Asaas |
| Compra de bens físicos / serviços do mundo real? | O app **registra** aluguéis e cobranças de locação (imóveis/veículos/equipamentos). A confirmação de aluguel/comprovante é gestão documental; não é marketplace de cartão embutido para o aluguel em si |
| Assinatura / conteúdo digital pago? | **Sim** — planos do AlugaPro (SaaS). Checkout abre URL da **Asaas** (`window.open` / navegador), **não** Google Play Billing |
| Criptomoedas / NFT? | **Não** |
| Empréstimos / crédito / corretagem de investimento? | **Não** |

**Atenção Play Billing:** confirme na política vigente se o modelo “SaaS com pagamento externo (Asaas)” se enquadra nas exceções de apps multiplataforma / serviços empresariais. O fluxo atual **não** implementa Billing Library da Google.

---

## Login e autenticação

| Método | Disponível |
|--------|------------|
| E-mail e senha (Firebase Auth) | Sim |
| Google Sign-In | Sim (web: popup; Android/iOS: `@capgo/capacitor-social-login`) |
| Facebook / Apple / Twitter | **Não** (desabilitados na config Capacitor) |
| Conta demo | Pode existir para demonstração comercial (somente leitura em empresa demo) — não usar como conta de produção |

---

## SDKs e compartilhamento com terceiros

Liste na Console / Data safety conforme aplicável:

| SDK / serviço | Função |
|---------------|--------|
| Firebase Auth, Firestore, Storage, Cloud Messaging | Conta, dados, arquivos, push |
| Google Sign-In | Login social |
| Capacitor (+ Filesystem, Share, Splash, StatusBar, App) | Runtime nativo |
| Asaas | Assinatura / cobrança SaaS |
| Cloudflare R2 | Armazenamento de arquivos |
| Cloudinary | Legado (URLs antigas de arquivos) |
| Resend / EmailJS | E-mail |
| Evolution API | WhatsApp operacional |
| Vercel | Hosting + API serverless |

---

## Links legais oficiais

| Documento | URL |
|-----------|-----|
| Política de Privacidade | https://alugapro.tech.br/politica-de-privacidade |
| Termos de Uso | https://alugapro.tech.br/termos |
| Exclusão de conta e dados | https://alugapro.tech.br/exclusao-de-conta |
| Descadastrar e-mail (marketing) | https://alugapro.tech.br/descadastrar |

Preencha na Play Console:

- **Privacy Policy URL** → política de privacidade  
- **Account deletion URL** → exclusão de conta  

---

## Checklist rápido antes de enviar o formulário

- [ ] Privacy Policy URL pública e acessível sem login  
- [ ] Account deletion URL pública e acessível sem login  
- [ ] Data safety bate com a política (CPF, fotos, financeiro, sem localização, sem ads)  
- [ ] Público 18+ / não direcionado a crianças  
- [ ] Justificativa de `CAMERA` e fotos (docs / contratos / comprovantes)  
- [ ] Declarar **sem anúncios**  
- [ ] Descrever assinatura SaaS via Asaas (pagamento externo)  
- [ ] E-mail de suporte correto: suporte@alugapro.com.br  
- [ ] Package name `com.alugapro.app` e versão atualizados no `build.gradle`  
- [ ] Capturas de tela e ícone coerentes com o produto (gestão / negócios)

---

## O que o sistema faz (produto)

| Área | Funcionalidades |
|------|-----------------|
| **Cadastros** | Imóveis, veículos, equipamentos, inquilinos e proprietários |
| **Contratos** | Modelos, contratos de locação e de venda, assinatura digital e testemunhas |
| **Financeiro** | Cobranças, despesas compartilhadas, inadimplência e relatórios |
| **Operação** | Manutenção, advertências, notificações (e-mail, push e WhatsApp) |
| **Portal do inquilino** | Contratos, cobranças e comprovantes |
| **Assinatura SaaS** | Planos e checkout via Asaas |
| **Afiliados** | Indicações, KYC e comissões (PIX) |
| **Marketing** | Campanhas de e-mail (Resend) |

Isolamento por **empresa (`companyId`)**. Papéis: `admin`, `gestor`, `inquilino`, `afiliado`.

No **app nativo**, a home redireciona para **login** (landing/marketing só na web).

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI |
| Estado / dados | TanStack Query, React Hook Form + Zod |
| Auth e banco | Firebase Auth, Firestore, Storage |
| Arquivos | Cloudflare R2 (atual); Cloudinary (legado) |
| Backend / API | Funções serverless na Vercel (`/api`) |
| Pagamentos SaaS | Asaas |
| Comunicação | Resend, EmailJS, Evolution API (WhatsApp) |
| Mobile | Capacitor (Android / iOS) + PWA |
| i18n | i18next (pt-BR, en, es) |

---

## Estrutura do repositório

```
AlugaPro/
├── src/
│   ├── modules/          # Domínios (auth, contracts, charges, …)
│   ├── services/         # Firestore / integrações
│   ├── components/       # UI compartilhada, layout, landing
│   ├── hooks/
│   ├── contexts/         # Auth e empresa
│   ├── lib/
│   └── i18n/
├── api/                  # Endpoints Vercel
├── android/ · ios/       # Capacitor
├── docs/                 # Ex.: segurança
├── firestore.rules
├── storage.rules
└── vercel.json
```

---

## Pré-requisitos e ambiente local

- Node.js 18+ (LTS recomendado)
- Conta Firebase (Auth, Firestore, Storage)
- Conta Vercel
- Variáveis conforme `.env.example`

```bash
npm install
cp .env.example .env   # preencher ao menos VITE_FIREBASE_*
npm run dev            # frontend
npm run dev:api        # APIs locais (/api)
```

Build: `npm run build` · Preview: `npm run preview`

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Vite |
| `npm run dev:api` | API local |
| `npm run build` | Typecheck + Vite + pré-render SEO |
| `npm run lint` | ESLint |
| `npm run build:mobile` | Build web + sync Capacitor |
| `npm run open:android` / `open:ios` | Android Studio / Xcode |

Build mobile detalhado: [`MOBILE_BUILD.md`](./MOBILE_BUILD.md).

---

## Segurança e multi-tenant

- Regras críticas em **Firestore Rules**, **Storage Rules** e APIs com Firebase ID token.
- Frontend **não** é a única barreira.
- Headers de segurança em `vercel.json`.
- Planejamento: [`docs/seguranca-planejamento.md`](./docs/seguranca-planejamento.md).

---

## Deploy

- **Web + API:** Vercel  
- **Mobile:** Capacitor → Android Studio / Xcode (`MOBILE_BUILD.md`)  
- **WhatsApp:** Evolution API (`docker-compose.evolution.yml`, ex. Railway)

---

## Documentação relacionada

| Arquivo | Conteúdo |
|---------|----------|
| [`.env.example`](./.env.example) | Variáveis de ambiente |
| [`MOBILE_BUILD.md`](./MOBILE_BUILD.md) | Build e publicação Android / iOS |
| [`docs/seguranca-planejamento.md`](./docs/seguranca-planejamento.md) | Segurança |
| [`resources/README.md`](./resources/README.md) | Ícones e splash Capacitor |

---

## Licença

Projeto privado (`private: true`). Uso restrito aos mantenedores do AlugaPro.
