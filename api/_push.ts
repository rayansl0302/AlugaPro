/**
 * Envio de push notification via Firebase Cloud Messaging.
 * Compartilhado entre whatsapp-notify.ts (envio manual) e
 * cron-daily-notifications.ts (envio automático).
 */
import { adminDb, adminMessaging } from './_firebase.js'

export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  if (tokens.length === 0) return { ok: false, error: 'Nenhum token de notificação cadastrado.' }

  try {
    const result = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: { fcmOptions: { link: '/portal' } },
    })

    // Tokens inválidos/expirados são removidos do doc do usuário — evita
    // acumular lixo e tentar reenviar pra dispositivos que não existem mais.
    const invalidTokens = result.responses
      .map((r, i) => (!r.success && isTokenInvalid(r.error?.code) ? tokens[i] : null))
      .filter((t): t is string => t !== null)

    if (invalidTokens.length > 0) {
      await removeInvalidTokens(invalidTokens)
    }

    if (result.successCount === 0) {
      const firstError = result.responses.find((r) => !r.success)?.error?.message
      return { ok: false, error: firstError ?? 'Falha ao enviar para todos os tokens.' }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// Busca os tokens FCM do(s) usuário(s) logado(s) vinculado(s) a um inquilino
// (users/{uid}.tenantId == tenantId) — o token fica no doc do usuário, não
// no doc do tenant, porque quem concede a permissão de notificação é quem
// está logado no navegador.
export async function getTokensForTenant(tenantId: string): Promise<string[]> {
  try {
    const snap = await adminDb.collection('users').where('tenantId', '==', tenantId).get()
    const tokens = snap.docs.flatMap((d) => (d.data().fcmTokens as string[] | undefined) ?? [])
    return [...new Set(tokens)]
  } catch (err) {
    console.error('[_push] Falha ao buscar tokens do inquilino:', err)
    return []
  }
}

function isTokenInvalid(code?: string): boolean {
  return code === 'messaging/registration-token-not-registered'
    || code === 'messaging/invalid-registration-token'
}

async function removeInvalidTokens(tokens: string[]): Promise<void> {
  try {
    const snap = await adminDb.collection('users').where('fcmTokens', 'array-contains-any', tokens.slice(0, 30)).get()
    await Promise.all(snap.docs.map(async (d) => {
      const current = (d.data().fcmTokens as string[] | undefined) ?? []
      const cleaned = current.filter((t) => !tokens.includes(t))
      if (cleaned.length !== current.length) {
        await d.ref.update({ fcmTokens: cleaned })
      }
    }))
  } catch (err) {
    console.error('[_push] Falha ao limpar tokens inválidos:', err)
  }
}
