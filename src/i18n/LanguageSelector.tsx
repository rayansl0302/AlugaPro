import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { APP_LOCALES, AppLocale, LOCALE_LABELS, normalizeLocale } from './locales'
import { useLocale } from './useLocale'
import { FlagIcon } from './flags'

interface LanguageSelectorProps {
  className?: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  align?: 'start' | 'center' | 'end'
  showLabel?: boolean
}

export function LanguageSelector({
  className,
  variant = 'ghost',
  size = 'sm',
  align = 'end',
  showLabel = false,
}: LanguageSelectorProps) {
  const { t } = useTranslation('common')
  const { locale, setLocale } = useLocale()
  const current = normalizeLocale(locale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn('gap-1.5', className)}
          aria-label={t('language.title')}
        >
          <span className="h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10">
            <FlagIcon locale={current} className="h-full w-full object-cover" />
          </span>
          {showLabel && <span className="text-sm">{LOCALE_LABELS[current]}</span>}
          {showLabel && <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[10rem]">
        {APP_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => void setLocale(code as AppLocale)}
            className={cn('gap-2', current === code && 'bg-accent font-medium')}
          >
            <span className="h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10">
              <FlagIcon locale={code as AppLocale} className="h-full w-full object-cover" />
            </span>
            {LOCALE_LABELS[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
