# Planejamento de Segurança — AlugaPro

> Documento de referência para proteção contra ataques, abusos e vazamentos de dados.  
> Stack atual: **React + Vite + Firebase Auth + Firestore + Storage + Capacitor**.  
> Modelo: **multi-tenant** por `companyId`, papéis `admin | gestor | proprietario | inquilino`.

**Última revisão:** junho/2026  
**Responsável sugerido:** tech lead + revisão periódica trimestral

---

## 1. Objetivos

| Objetivo | Descrição |
|----------|-----------|
| **Confidencialidade** | Inquilino A não acessa dados do inquilino B, nem de outra empresa |
| **Integridade** | Valores de contrato, cobrança e comprovante não podem ser alterados pelo cliente errado |
| **Disponibilidade** | Resistir a abuso (spam, brute force, upload massivo) sem derrubar o serviço |
| **Rastreabilidade** | Ações sensíveis auditáveis (quem alterou o quê e quando) |
| **Conformidade** | LGPD: dados pessoais (CPF, endereço, comprovantes) com base legal e retenção definida |

**Princípio central:** o frontend **nunca** é a única barreira. Toda regra crítica deve existir em **Firestore Rules**, **Storage Rules** e, quando necessário, **Cloud Functions**.

---

## 2. Mapa de ameaças (resumo)

| Ameaça | Vetor típico | Onde ataca no AlugaPro | Prioridade |
|--------|--------------|------------------------|------------|
| **Credential stuffing / brute force** | Lista de senhas vazadas | Login e-mail/senha, Google OAuth | Alta |
| **IDOR** (acesso a recurso alheio) | Manipular `companyId`, `tenantId`, `chargeId` na API | Firestore/Storage direto pelo SDK | Crítica |
| **Privilege escalation** | Alterar `role` ou `companyId` no doc `users/{uid}` | Firestore write em `users` | Crítica |
| **XSS** | HTML/URL malicioso em campos exibidos | Portal, comentários de chamados, nomes | Alta |
| **Exfiltração via Storage** | Ler path de comprovante/contrato de outro tenant | `storage.rules` permissivas | Crítica |
| **Abuso de link público** | Enumerar tokens de testemunha | `witnessSignatures/{token}` | Média |
| **Spam / DoS lógico** | Criar milhares de docs ou uploads | `auditLogs`, chamados, storage | Média |
| **Supply chain** | Dependência npm comprometida | Build CI/CD | Média |
| **Vazamento de segredos** | Senha em `localStorage`, `.env` no git | Login "lembrar-me", repositório | Alta |

---

## 3. Estado atual (baseline do projeto)

### 3.1 O que já está bem encaminhado

- **Firestore Rules** com funções de papel (`isGestor`, `isLinkedTenant`, `sameCompany`).
- **Isolamento parcial por empresa** em coleções principais.
- **Updates restritos do inquilino** em `charges` (só comprovante, sem mudar valor/status) e `contracts` (só assinatura).
- **Convites** (`userInvites`) amarram `role` e `companyId` na criação do usuário.
- **Assinatura de testemunha** com update limitado (não reescreve contrato).
- **Limites de tamanho e tipo** em uploads no Storage (imagem/PDF, MB máx.).
- **Rotas protegidas** no React (`ProtectedRoute`, `TenantRoute`) por papel.
- **CORS** do bucket restrito a origens conhecidas (`cors.json`).

### 3.2 Gaps identificados (status revisado em 24/jul/2026)

| ID | Risco | Status |
|----|-------|--------|
| G1 | Senha salva em `localStorage` no "Lembrar-me" | ✅ **Corrigido** — só o e-mail é persistido |
| G2 | Storage permissivo entre empresas | ✅ **Corrigido** — `storage.rules` com `isGestorOf`/vínculo por empresa |
| G3 | Inquilino lê todos `owners`/`sharedExpenses` da empresa (filtro no client) | ⚠️ **Risco residual aceito** — portal usa a lista; dados limitados à própria empresa. Fase 1 |
| G4 | `auditLogs` create aberto | ✅ **Corrigido** — `create: if isGestor()` |
| G5 | E-mails de admin hardcoded | ⚠️ Aberto (baixo impacto) — migrar p/ custom claims na Fase 1 |
| G6 | Usuários demo com senha fixa | ⚠️ **Decisão de produto** — demo comercial; rules dão só LEITURA da empresa `alugapro-demo`; sem token real não há escrita |
| G7 | Link público de testemunha | ✅ **Mitigado** — token 128 bits Web Crypto **fail-closed** (fallback `Math.random` removido em 24/jul) |
| G8 | Assinatura de contrato usava `auth.uid == tenantId` | ✅ **Corrigido 24/jul** — `isLinkedTenant()` (mesmo padrão de `charges`) |
| G9 | Sem CSP/headers | ✅ **Parcial 24/jul** — HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy e CSP base no `vercel.json`. App Check segue na Fase 2 |
| G10 | Sem lockout customizado | 🟢 Melhoria futura (Firebase Auth já aplica throttling) |

### 3.3 Vulnerabilidades do backend Vercel (encontradas e corrigidas em 24/jul/2026)

| ID | Vulnerabilidade | Correção |
|----|-----------------|----------|
| V1 🔴 | `/api/whatsapp-qr` **sem auth** — QR/número expostos (sequestro da sessão WhatsApp) | Exige ID token de gestor/admin (`api/_auth.ts`) |
| V2 🔴 | `INTERNAL_API_KEY` exposta no bundle via `VITE_` + endpoint fail-open — envio de WhatsApp em nome da empresa por qualquer um | `VITE_INTERNAL_API_KEY` removida; fail-closed com ID token; charge update escopado à empresa |
| V3 🔴 | `asaas-webhook` fail-open sem env — pagamento forjável (assinatura grátis + comissão falsa) | Fail-closed: sem token configurado, recusa tudo |
| V4 🟠 | `checkout`/`verify-asaas-subscription` sem auth — checkout/re-sync de qualquer empresa | ID token + empresa do próprio usuário |
| V5 🟠 | Sem security headers | Headers no `vercel.json` |
| V6 🟡 | Cron fail-open sem `CRON_SECRET` | Fail-closed |
| V8 🟡 | Token de testemunha/venda com fallback `Math.random` | Web Crypto fail-closed |
| V9 🟡 | 36 vulns npm (2 críticas) | `xlsx` 0.20.3 oficial + audit fix + `@vercel/node`→devDeps → 23 restantes (transitivas do `firebase@10`; upgrade major planejado) |

**Regra operacional:** todo endpoint novo em `api/` DEVE usar `requireUser`/`requireGestor` de `api/_auth.ts`, ou justificar por escrito por que é público. Webhooks SEMPRE fail-closed.

---

## 4. Arquitetura de defesa em camadas

```
┌─────────────────────────────────────────────────────────────┐
│  Camada 1 — Perímetro                                       │
│  HTTPS, HSTS, WAF (Cloudflare/Firebase Hosting headers),    │
│  CSP, rate limit de IP, bot protection                      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Camada 2 — Identidade                                      │
│  Firebase Auth, e-mail verificado, MFA (gestores),            │
│  App Check, bloqueio progressivo de login                   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Camada 3 — Autorização (regras de dados)                   │
│  Firestore Rules + Storage Rules + Custom Claims (futuro)   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Camada 4 — Aplicação (React)                               │
│  Rotas por papel, validação Zod, sanitização, UX segura     │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Camada 5 — Observabilidade                                 │
│  Audit logs confiáveis, alertas, backup, resposta a incidente│
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Plano de implementação por fases

### Fase 0 — Correções imediatas (1–2 semanas) 🔴

| # | Ação | Detalhe técnico | Critério de aceite |
|---|------|-----------------|-------------------|
| 0.1 | Remover senha do "Lembrar-me" | Persistir **apenas e-mail** em `localStorage`; nunca senha | Auditoria de código + teste manual |
| 0.2 | Endurecer **Storage Rules** | Espelhar lógica do Firestore: `sameCompany`, `isLinkedTenant`, paths por `tenantId`/`companyId` | Inquilino não lê comprovante de outro inquilino via SDK |
| 0.3 | Corrigir leitura de contratos para inquilino | Usar `isLinkedTenant(resource.data.tenantId)` em `contracts` read (como em `charges`) | Inquilino vê só seus contratos |
| 0.4 | Restringir `auditLogs` create | Apenas `isGestor()` ou escrita via **Cloud Function** com service account | Cliente não spamma logs falsos |
| 0.5 | Garantir build de produção sem demo auth | `DEMO_USERS` / `DEMO_PASSWORD` atrás de `import.meta.env.DEV` | Bundle prod não contém backdoor demo |
| 0.6 | Deploy das rules após cada mudança | `firebase deploy --only firestore:rules,storage` | Checklist de release |

**Exemplo de direção para Storage (esboço):**

```javascript
// receipts: gestor da empresa OU inquilino dono da cobrança (validar chargeId via get())
match /receipts/{companyId}/{chargeId}/{filename} {
  allow read: if isAuth() && (
    isGestorOf(companyId) ||
    isLinkedTenantOfCharge(companyId, chargeId)
  );
  allow write: if isAuth() && isReceiptType() && maxSize(10) && (
    isGestorOf(companyId) ||
    isLinkedTenantOfCharge(companyId, chargeId)
  );
  allow delete: if isGestorOf(companyId);
}
```

> Nota: validar `chargeId` no Storage exige `firestore.get()` nas rules — planejar custo e testes.

---

### Fase 1 — Autorização fina e dados sensíveis (2–4 semanas) 🟡

| # | Ação | Detalhe |
|---|------|---------|
| 1.1 | Leitura de `properties` / `vehicles` para inquilino | Permitir read apenas do imóvel/veículo **vinculado a contrato ativo** do inquilino (não lista inteira da empresa) |
| 1.2 | Leitura de `owners` para inquilino | Mesma lógica: só `ownerId` do contrato ativo |
| 1.3 | `sharedExpenses` read para inquilino | Regra que verifica participação no array `participants` (ou subcoleção) — não confiar só no filtro React |
| 1.4 | Tokens de testemunha | UUID v4 criptograficamente seguro; expiração (`expiresAt`); rate limit na rota pública; opcional CAPTCHA após N tentativas |
| 1.5 | Custom Claims no Firebase Auth | `companyId`, `role` no token JWT — reduz `get()` nas rules e evita tampering em `users` doc (leitura ainda validada) |
| 1.6 | Admin por custom claim | Substituir lista de e-mails nas rules por `request.auth.token.admin == true` setado só via Admin SDK |

---

### Fase 2 — Proteção de aplicação e perímetro (1 mês) 🟢

| # | Ação | Detalhe |
|---|------|---------|
| 2.1 | **Content-Security-Policy** | Headers no Firebase Hosting: `default-src 'self'`, Firebase, Cloudinary; evitar `unsafe-inline` onde possível |
| 2.2 | **Firebase App Check** | reCAPTCHA Enterprise ou Play Integrity / App Attest no mobile |
| 2.3 | **MFA obrigatório** para `admin` e `gestor` | Firebase Auth multi-factor |
| 2.4 | Sanitização | DOMPurify se houver HTML rico; escapar dados em PDF/contratos gerados no client |
| 2.5 | Headers de segurança | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS |
| 2.6 | Dependências | `npm audit` no CI; Dependabot/Renovate; bloquear merge com vulnerabilidade alta |

---

### Fase 3 — Backend confiável e operações (contínuo)

| # | Ação | Detalhe |
|---|------|---------|
| 3.1 | **Cloud Functions** para operações críticas | Validar comprovante, mudar status de cobrança, gerar cobranças, webhooks de pagamento |
| 3.2 | **Rate limiting** | Cloud Functions + Firestore counters ou serviço externo (Upstash, Cloudflare) em login, upload, witness sign |
| 3.3 | **Backup** | Export agendado Firestore; retenção; teste de restore trimestral |
| 3.4 | **SIEM / alertas** | Firebase Alerts, log de Auth failures, pico de writes, regras negadas (`permission-denied`) |
| 3.5 | **LGPD** | ROPA, política de retenção, exclusão de titular, criptografia em repouso (padrão GCP) |
| 3.6 | **Pentest** | Teste manual IDOR anual ou antes de lançamentos grandes |

---

## 6. Segurança por módulo do produto

### 6.1 Autenticação e sessão

| Controle | Status | Meta |
|----------|--------|------|
| Mensagem genérica no login | ✅ Parcial | Manter "E-mail ou senha inválidos" |
| Lembrar senha no browser | ❌ G1 | Só e-mail |
| MFA gestores | ❌ | Fase 2 |
| Logout limpa estado | ✅ | Incluir limpar caches React Query sensíveis |
| OAuth Google | ✅ | Validar domínio corporativo se B2B no futuro |

### 6.2 Portal do inquilino

| Recurso | Risco | Mitigação |
|---------|-------|-----------|
| Upload comprovante | Trocar `chargeId` | Rules Firestore + Storage amarradas ao `tenantId` |
| Ver imóvel/proprietário | Listar todos da empresa | Fase 1 — read escopado ao contrato |
| Comentários em chamados | XSS | Sanitizar texto; sem HTML; limite de tamanho nas rules |
| Despesas compartilhadas | Ver despesas de outros | Rule em `participants` |

### 6.3 Contratos e assinaturas

| Recurso | Risco | Mitigação |
|---------|-------|-----------|
| PDF no client | Integridade visual | Hash do PDF no Firestore; gestor valida |
| Assinatura inquilino | Alterar valor | ✅ Rules imutáveis em campos financeiros |
| Link testemunha | Vazamento / brute force | Token longo, TTL, auditoria de acesso |

### 6.4 Gestor / admin

| Recurso | Risco | Mitigação |
|---------|-------|-----------|
| Convite de usuário | Escalar para admin | Convite só cria papéis permitidos pelo gestor |
| Exclusão em massa | Erro humano | Confirmação + soft delete + audit |
| Relatórios export | Vazamento CSV | Download só `isGestor` + log de export |

---

## 7. Storage — matriz alvo de permissões

| Path | Leitura | Escrita | Exclusão |
|------|---------|---------|----------|
| `receipts/{companyId}/{chargeId}/*` | Gestor da empresa; inquilino da cobrança | Mesmos | Gestor |
| `properties/{companyId}/{propertyId}/*` | Gestor; inquilino com contrato no imóvel | Gestor | Gestor |
| `vehicles/{companyId}/{vehicleId}/*` | Gestor; inquilino com contrato no veículo | Gestor | Gestor |
| `tenants/{companyId}/{tenantId}/*` | Gestor; próprio inquilino | Gestor; próprio inquilino | Gestor |
| `contracts/{companyId}/{contractId}/*` | Gestor; inquilinos/partes do contrato | Gestor; fluxo de assinatura validado | Gestor |
| `avatars/{userId}/*` | Autenticados | Próprio usuário | Próprio usuário |
| `companies/{companyId}/logo/*` | Autenticados da empresa | Gestor | Gestor |

---

## 8. Firestore — checklist de revisão de rules

Use em toda PR que toque em `firestore.rules`:

- [ ] Toda coleção tem `allow read` **mínimo necessário** (não `sameCompany` amplo se inquilino acessa)?
- [ ] `allow update` do inquilino lista **todos** os campos imutáveis?
- [ ] `request.resource.data.companyId` não pode ser alterado em updates de usuário não admin?
- [ ] `create` valida que `companyId` do payload = empresa do criador?
- [ ] Não existe `allow write: if true` em produção?
- [ ] Funções helper evitam `get()` excessivo (custo + latência)?
- [ ] Testes com **Firebase Rules Unit Tests** (`@firebase/rules-unit-testing`)?

---

## 9. Frontend — checklist de segurança

- [ ] Nenhum segredo (API secret, private key) no bundle Vite
- [ ] `dangerouslySetInnerHTML` proibido ou com DOMPurify
- [ ] URLs externas com `rel="noopener noreferrer"`
- [ ] Upload: validar tipo/tamanho no client **e** nas rules
- [ ] Rotas sensíveis com guard de papel **e** checagem server-side
- [ ] Erros não expõem stack trace ao usuário em produção
- [ ] `console.log` sem PII em produção (strip no build)

---

## 10. CI/CD e ambientes

| Ambiente | Firebase project | Regras |
|----------|------------------|--------|
| **dev** | projeto dev | Rules relaxadas só se necessário; sem dados reais |
| **staging** | espelho de prod | Rules idênticas à produção |
| **prod** | produção | Deploy rules obrigatório no pipeline |

**Pipeline mínimo:**

1. `npm ci`
2. `npm run build`
3. `npm audit --audit-level=high` (falhar ou alertar)
4. Testes de rules (quando existirem)
5. Deploy hosting + rules em job separado com aprovação manual

---

## 11. Resposta a incidentes (runbook resumido)

### 11.1 Classificação

| Nível | Exemplo | Tempo de resposta |
|-------|---------|-------------------|
| **P1** | Vazamento de comprovantes/contratos entre empresas | Imediato |
| **P2** | Conta gestor comprometida | < 4 h |
| **P3** | Tentativas de brute force detectadas | < 24 h |

### 11.2 Passos P1 (vazamento de dados)

1. **Conter:** desabilitar regra afetada ou tirar feature do ar (hosting rollback).
2. **Revogar:** forçar logout (`revokeRefreshTokens` via Admin SDK) se conta comprometida.
3. **Investigar:** logs Firebase Auth, audit logs, paths Storage acessados.
4. **Corrigir:** patch rules + deploy + validação IDOR.
5. **Comunicar:** gestores afetados + ANPD se dados pessoais (LGPD, prazo legal).
6. **Post-mortem:** documento interno em 5 dias úteis.

### 11.3 Contatos (preencher)

| Papel | Nome | Contato |
|-------|------|---------|
| Responsável técnico | _a definir_ | |
| DPO / privacidade | _a definir_ | |
| Firebase/GCP support | Console GCP | |

---

## 12. Testes de segurança recomendados

### 12.1 Testes manuais (a cada release grande)

1. Logar como **inquilino A** → tentar ler `charges`, `contracts`, `receipts` do inquilino B (DevTools → Firestore/Storage SDK ou REST).
2. Inquilino tenta `update` em `charge.status` para `pago` → deve falhar.
3. Gestor empresa X tenta ler empresa Y → deve falhar.
4. Acessar `witnessSignatures/{token-invalido}` → não vazar lista.
5. Upload de `.exe` renomeado para `.jpg` → rejeitar no Storage.

### 12.2 Automação (roadmap)

```bash
# Exemplo futuro
npm run test:rules
```

Cenários mínimos em `@firebase/rules-unit-testing`:

- `charges` update inquilino só com `receipt` + `receiptStatus: aguardando`
- `storage` read receipt negado para outro tenant
- `users` update não altera `role`

---

## 13. Métricas e KPIs de segurança

| Métrica | Meta |
|---------|------|
| Deploys com rules desatualizadas | 0 |
| Vulnerabilidades npm **high/critical** abertas > 30 dias | 0 |
| Incidentes P1 por trimestre | 0 |
| Cobertura de testes de rules (cenários críticos) | ≥ 80% dos fluxos IDOR |
| Tempo médio patch crítico | < 48 h |

---

## 14. Roadmap visual (resumo)

```
Agora          1 mês              2–3 meses           Contínuo
  │               │                    │                  │
  ▼               ▼                    ▼                  ▼
Fase 0         Fase 1               Fase 2             Fase 3
G1,G2,G3       owners/properties    CSP, App Check     Functions
storage        scoped read          MFA gestores       Rate limit
audit logs     witness TTL          npm audit CI       Backup/restore
demo off       custom claims        Pentest            LGPD ops
```

---

## 15. Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

## 16. Próximos passos sugeridos (ação imediata)

1. **Aprovar** este planejamento e priorizar Fase 0.
2. **Abrir tarefas** separadas: G1 (lembrar-me), G2 (storage rules), G8 (contracts read).
3. **Agendar** revisão trimestral deste documento.
4. **Preencher** seção 11.3 (contatos de incidente).

---

*Este documento é planejamento — não substitui parecer jurídico nem pentest profissional.*
