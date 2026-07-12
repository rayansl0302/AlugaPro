import { Building2, Users, Shield, Palette } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

export function SettingsPage() {
  const { t } = useTranslation('settings')
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-medium text-muted-foreground">{t('accessDenied')}</p>
        <p className="text-sm text-muted-foreground">{t('accessDeniedDescription')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="empresa">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="empresa">{t('tabs.company')}</TabsTrigger>
          <TabsTrigger value="usuarios">{t('tabs.users')}</TabsTrigger>
          <TabsTrigger value="aparencia">{t('tabs.appearance')}</TabsTrigger>
          <TabsTrigger value="seguranca">{t('tabs.security')}</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('companyTitle')}
              </CardTitle>
              <CardDescription>{t('companyDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('companyName')}</Label>
                  <Input defaultValue="Imobiliária Exemplo" />
                </div>
                <div className="space-y-2">
                  <Label>{t('form.cnpj')}</Label>
                  <Input placeholder="00.000.000/0001-00" />
                </div>
                <div className="space-y-2">
                  <Label>{t('contactEmail')}</Label>
                  <Input type="email" placeholder="contato@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>{t('form.phone')}</Label>
                  <Input placeholder="(00) 0000-0000" />
                </div>
              </div>
              <Button>{t('save')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('usersTitle')}
              </CardTitle>
              <CardDescription>{t('usersDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('usersDev')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('sections.appearance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-3">{t('theme')}</p>
                <div className="flex gap-3">
                  {(['light', 'dark', 'system'] as const).map((themeOption) => (
                    <button
                      key={themeOption}
                      onClick={() => setTheme(themeOption)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                        theme === themeOption
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {themeOption === 'light' ? t('themeLight') : themeOption === 'dark' ? t('themeDark') : t('themeSystem')}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('sections.security')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('newPassword')}</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>{t('confirmPassword')}</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button>{t('changePassword')}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
