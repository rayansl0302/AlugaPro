import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Shield, Palette, Mail, Contact, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { getCompany, updateCompany } from '@/services/company'
import { EmailMarketingPanel, LeadsPanel } from '@/modules/email-marketing/EmailMarketingPage'
import { maskCNPJ, maskCEP, maskPhone } from '@/lib/utils'
import { fieldErrorClass } from '@/lib/formErrors'
import { requiredString } from '@/lib/validation'
import { toast } from '@/hooks/useToast'

const companySchema = z.object({
  name: requiredString('Nome obrigatório'),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  bank: z.string().optional(),
  agency: z.string().optional(),
  account: z.string().optional(),
  accountType: z.enum(['corrente', 'poupanca', 'pix']).default('pix'),
  pixKey: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

function CompanyTab({ companyId }: { companyId: string }) {
  const { t } = useTranslation('settings')
  const [saving, setSaving] = useState(false)

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => getCompany(companyId),
    enabled: !!companyId,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    mode: 'onTouched',
    defaultValues: { accountType: 'pix' },
  })

  useEffect(() => {
    if (!company) return
    reset({
      name: company.name,
      cnpj: company.cnpj ?? '',
      cpf: company.cpf ?? '',
      email: company.email ?? '',
      phone: company.phone ?? '',
      street: company.address?.street ?? '',
      number: company.address?.number ?? '',
      complement: company.address?.complement ?? '',
      neighborhood: company.address?.neighborhood ?? '',
      city: company.address?.city ?? '',
      state: company.address?.state ?? '',
      zipCode: company.address?.zipCode ?? '',
      bank: company.bankAccount?.bank ?? '',
      agency: company.bankAccount?.agency ?? '',
      account: company.bankAccount?.account ?? '',
      accountType: company.bankAccount?.type ?? 'pix',
      pixKey: company.bankAccount?.pixKey ?? '',
    })
  }, [company, reset])

  const onSubmit = async (data: CompanyFormData) => {
    setSaving(true)
    try {
      await updateCompany(companyId, {
        name: data.name,
        ...(data.cnpj ? { cnpj: data.cnpj.replace(/\D/g, '') } : {}),
        ...(data.cpf ? { cpf: data.cpf.replace(/\D/g, '') } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone ? { phone: data.phone.replace(/\D/g, '') } : {}),
        ...(data.street
          ? {
              address: {
                street: data.street,
                number: data.number ?? '',
                complement: data.complement,
                neighborhood: data.neighborhood ?? '',
                city: data.city ?? '',
                state: data.state ?? '',
                zipCode: (data.zipCode ?? '').replace(/\D/g, ''),
              },
            }
          : {}),
        ...(data.bank || data.pixKey
          ? {
              bankAccount: {
                bank: data.bank ?? '',
                agency: data.agency ?? '',
                account: data.account ?? '',
                type: data.accountType,
                ...(data.pixKey ? { pixKey: data.pixKey } : {}),
              },
            }
          : {}),
      })
      toast({ title: t('toast.saved') })
    } catch {
      toast({ title: t('toast.saveError'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('companyName')}</Label>
              <Input className={fieldErrorClass(errors.name)} {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('form.cnpj')}</Label>
              <Input
                placeholder="00.000.000/0001-00"
                {...register('cnpj')}
                onChange={(e) => setValue('cnpj', maskCNPJ(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('form.cpf')}</Label>
              <Input
                placeholder="000.000.000-00"
                {...register('cpf')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('contactEmail')}</Label>
              <Input type="email" className={fieldErrorClass(errors.email)} {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('form.phone')}</Label>
              <Input
                placeholder="(00) 00000-0000"
                {...register('phone')}
                onChange={(e) => setValue('phone', maskPhone(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('form.address')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('form.street')}</Label>
              <Input {...register('street')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.number')}</Label>
              <Input {...register('number')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.complement')}</Label>
              <Input {...register('complement')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.neighborhood')}</Label>
              <Input {...register('neighborhood')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.city')}</Label>
              <Input {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.state')}</Label>
              <Input maxLength={2} {...register('state')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.zipCode')}</Label>
              <Input
                placeholder="00000-000"
                {...register('zipCode')}
                onChange={(e) => setValue('zipCode', maskCEP(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('form.bankAccount')}</CardTitle>
          <CardDescription>{t('bankAccountDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('form.bank')}</Label>
              <Input {...register('bank')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.accountType')}</Label>
              <Select value={watch('accountType')} onValueChange={(v) => setValue('accountType', v as CompanyFormData['accountType'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="corrente">{t('form.accountTypeCorrente')}</SelectItem>
                  <SelectItem value="poupanca">{t('form.accountTypePoupanca')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form.agency')}</Label>
              <Input {...register('agency')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.account')}</Label>
              <Input {...register('account')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('form.pixKey')}</Label>
              <Input {...register('pixKey')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('save')}
      </Button>
    </form>
  )
}

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
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-4 w-4" /> E-mail Marketing
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5">
            <Contact className="h-4 w-4" /> Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <CompanyTab companyId={user.companyId} />
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

        <TabsContent value="email">
          <EmailMarketingPanel />
        </TabsContent>

        <TabsContent value="leads">
          <LeadsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
