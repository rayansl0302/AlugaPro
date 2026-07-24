import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Smartphone, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react'

type WaStatus =
  | { configured: false }
  | { configured: true; connected: true; number?: string }
  | { configured: true; connected: false; state?: string; qrcode?: string; error?: string }

export function WhatsAppPage() {
  const { t } = useTranslation('settings')
  const [status, setStatus] = useState<WaStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const { auth } = await import('@/lib/firebase')
      const idToken = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/whatsapp-qr', {
        headers: { Authorization: `Bearer ${idToken ?? ''}` },
      })
      const text = await res.text()
      try {
        const data: WaStatus = JSON.parse(text)
        setStatus(data)
        setLastUpdate(new Date())
      } catch {
        setStatus({ configured: true, connected: false, error: t('whatsapp.invalidResponse', { status: res.status, text: text.slice(0, 120) }) })
      }
    } catch (err) {
      setStatus({ configured: true, connected: false, error: t('whatsapp.networkError', { error: String(err) }) })
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // Auto-refresh a cada 30s enquanto não conectado
  useEffect(() => {
    if (status && 'connected' in status && status.connected) return
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [status, fetchStatus])

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          {t('whatsapp.title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('whatsapp.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('whatsapp.statusTitle')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {lastUpdate && (
            <CardDescription className="text-xs">
              {t('whatsapp.updatedAt', { time: lastUpdate.toLocaleTimeString('pt-BR') })}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {!status ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !status.configured ? (
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  {t('whatsapp.notConfigured')}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  {t('whatsapp.notConfiguredPrefix')}{' '}
                  <code className="font-mono">EVOLUTION_API_URL</code>,{' '}
                  <code className="font-mono">EVOLUTION_API_KEY</code> {t('whatsapp.notConfiguredAnd')}{' '}
                  <code className="font-mono">EVOLUTION_INSTANCE</code> {t('whatsapp.notConfiguredSuffix')}
                </p>
              </div>
            </div>
          ) : status.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-800 dark:text-green-400">{t('whatsapp.connected')}</p>
                  {status.number && (
                    <p className="text-xs text-green-700 dark:text-green-500 mt-0.5 font-mono">
                      {status.number}
                    </p>
                  )}
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400">
                  {t('whatsapp.online')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('whatsapp.autoNotificationsActive')}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {'error' in status && status.error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <WifiOff className="h-4 w-4 shrink-0" />
                  {status.error}
                </div>
              )}

              {status.qrcode ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-xl border-2 shadow-sm">
                    <img
                      src={status.qrcode}
                      alt={t('whatsapp.qrAlt')}
                      className="w-56 h-56 block"
                    />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-medium">{t('whatsapp.scanTitle')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('whatsapp.scanPath1')} <strong>{t('whatsapp.scanPathBold')}</strong> {t('whatsapp.scanPath2')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('whatsapp.qrAutoRefresh')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <WifiOff className="h-8 w-8" />
                  <p className="text-sm">{t('whatsapp.disconnected')}</p>
                  <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    {t('common:errors.tryAgain')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
