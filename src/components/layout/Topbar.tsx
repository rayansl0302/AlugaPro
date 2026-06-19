import { Moon, Sun, Search, Zap, AlertTriangle, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/contexts/ThemeContext'
import { NotificationBell } from './NotificationBell'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'

interface TopbarProps {
  title: string
  onMenuClick: () => void
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { status, daysRemaining, isAdmin, isLoading } = useSubscription()

  // Show for any gestor that isn't a real admin and hasn't paid yet
  const showUpgrade =
    !isLoading && !isAdmin && user?.role === 'gestor' && status !== 'active'

  const isUrgent = ['expired', 'canceled', 'past_due'].includes(status)

  const upgradeLabel =
    status === 'trialing' ? `${daysRemaining}d de trial` :
    status === 'past_due' ? 'Regularizar pagamento' :
    status === 'demo'     ? 'Ativar plano' :
    'Assinar agora'

  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b bg-card px-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {showUpgrade && (
          <Button
            size="sm"
            onClick={() => navigate('/configuracoes/assinatura')}
            className={cn(
              'gap-1.5 font-semibold shadow-sm',
              isUrgent
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white',
            )}
          >
            {isUrgent
              ? <AlertTriangle className="h-3.5 w-3.5" />
              : <Zap className="h-3.5 w-3.5 fill-current" />
            }
            <span className="hidden sm:inline">{upgradeLabel}</span>
            <span className="sm:hidden">{isUrgent ? 'Assinar' : `${daysRemaining}d`}</span>
          </Button>
        )}

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Pesquisar..." className="h-9 w-56 pl-9" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <NotificationBell />
      </div>
    </header>
  )
}
