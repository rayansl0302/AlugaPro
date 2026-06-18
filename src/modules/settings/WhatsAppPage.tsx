import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Smartphone, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react'

type WaStatus =
  | { configured: false }
  | { configured: true; connected: true; number?: string }
  | { configured: true; connected: false; state?: string; qrcode?: string; error?: string }

export function WhatsAppPage() {
  const [status, setStatus] = useState<WaStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp-qr')
      const text = await res.text()
      try {
        const data: WaStatus = JSON.parse(text)
        setStatus(data)
        setLastUpdate(new Date())
      } catch {
        setStatus({ configured: true, connected: false, error: `Resposta inválida do servidor (${res.status}): ${text.slice(0, 120)}` })
      }
    } catch (err) {
      setStatus({ configured: true, connected: false, error: `Falha de rede: ${String(err)}` })
    } finally {
      setLoading(false)
    }
  }, [])

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
          WhatsApp Automático
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte o chip para envio automático de cobranças via WhatsApp.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status da Conexão</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {lastUpdate && (
            <CardDescription className="text-xs">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')}
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
                  Evolution API não configurada
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  Adicione as variáveis{' '}
                  <code className="font-mono">EVOLUTION_API_URL</code>,{' '}
                  <code className="font-mono">EVOLUTION_API_KEY</code> e{' '}
                  <code className="font-mono">EVOLUTION_INSTANCE</code> no Vercel.
                </p>
              </div>
            </div>
          ) : status.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-800 dark:text-green-400">WhatsApp conectado!</p>
                  {status.number && (
                    <p className="text-xs text-green-700 dark:text-green-500 mt-0.5 font-mono">
                      {status.number}
                    </p>
                  )}
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400">
                  Online
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Notificações automáticas ativas. O cron roda todo dia às 8h (horário de Brasília).
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
                      alt="QR Code WhatsApp"
                      className="w-56 h-56 block"
                    />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-medium">Escaneie com o WhatsApp do chip</p>
                    <p className="text-xs text-muted-foreground">
                      Configurações → <strong>Aparelhos conectados</strong> → Conectar aparelho
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O QR code atualiza automaticamente a cada 30 segundos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <WifiOff className="h-8 w-8" />
                  <p className="text-sm">Instância desconectada. Buscando QR code...</p>
                  <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Tentar novamente
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
