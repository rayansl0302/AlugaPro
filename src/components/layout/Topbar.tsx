import { Moon, Sun, Search, Zap, AlertTriangle } from 'lucide-react'
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
}

export function Topbar({ title }: TopbarProps) {
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
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
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
