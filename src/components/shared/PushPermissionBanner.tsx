import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pushSupported, pushPermission, enablePushNotifications } from '@/services/pushNotifications'
import { toast } from '@/hooks/useToast'

const DISMISS_KEY = 'push-banner-dismissed'

export function PushPermissionBanner({ uid }: { uid: string }) {
  const { t } = useTranslation('notifications')
  const [visible, setVisible] = useState(false)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    if (!pushSupported()) return
    if (pushPermission() !== 'default') return
    if (localStorage.getItem(DISMISS_KEY) === '1') return
    setVisible(true)
  }, [])

  const handleEnable = async () => {
    setEnabling(true)
    const result = await enablePushNotifications(uid)
    setEnabling(false)
    if (result.ok) {
      toast({ title: t('pushBanner.enabled') })
      setVisible(false)
    } else {
      toast({ title: result.error ?? t('pushBanner.error'), variant: 'destructive' })
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <Bell className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t('pushBanner.title')}</p>
        <p className="text-xs text-muted-foreground">{t('pushBanner.description')}</p>
      </div>
      <Button size="sm" onClick={handleEnable} disabled={enabling}>
        {enabling ? t('pushBanner.enabling') : t('pushBanner.enable')}
      </Button>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground" title={t('pushBanner.dismiss')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
