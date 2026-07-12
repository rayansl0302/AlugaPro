import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import i18n from '@/i18n'
import { Plus, Search, Home, Edit, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Owner } from '@/types'
import { uploadOwnerPhoto } from '@/services/storage'
import { formatCPF, formatPhone, getInitials, maskCPF, maskPhone } from '@/lib/utils'
import { isValidCPF, isValidPhoneBR } from '@/lib/documents'
import { fieldErrorClass } from '@/lib/formErrors'
import { requiredString } from '@/lib/validation'
// Phone/Mail used in card variant below
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ReceiptUpload } from '@/components/shared/ReceiptUpload'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { Loader2 } from 'lucide-react'

async function getOwners(companyId: string): Promise<Owner[]> {
  const q = query(
    collection(db, 'owners'),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Owner))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const schema = z.object({
  name: requiredString(i18n.t('owners:validation.nameRequired')),
  cpf: z.string().optional().refine((v) => !v || isValidCPF(v), i18n.t('owners:validation.cpfInvalid')),
  email: z.string().email(i18n.t('owners:validation.emailInvalid')).optional().or(z.literal('')),
  phone: z.string().optional().refine((v) => !v || isValidPhoneBR(v), i18n.t('owners:validation.phoneInvalid')),
  whatsapp: z.string().optional().refine((v) => !v || isValidPhoneBR(v), i18n.t('owners:validation.phoneInvalid')),
})
type FormData = z.infer<typeof schema>

export function OwnersPage() {
  const { t } = useTranslation('owners')
  const { user } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['owners', companyId],
    queryFn: () => getOwners(companyId),
    enabled: !!companyId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, 'owners', id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owners'] })
      toast({ title: t('toast.deleted') })
    },
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {},
  })

  const onSubmit = async (data: FormData) => {
    setFormLoading(true)
    try {
      const payload = {
        companyId,
        ...data,
        cpf: data.cpf ? data.cpf.replace(/\D/g, '') : data.cpf,
        phone: data.phone ? data.phone.replace(/\D/g, '') : data.phone,
        whatsapp: data.whatsapp ? data.whatsapp.replace(/\D/g, '') : data.whatsapp,
        photoUrl: photoUrl || '',
        active: true,
      }
      if (editingOwner) {
        await updateDoc(doc(db, 'owners', editingOwner.id), { ...payload, updatedAt: serverTimestamp() })
        toast({ title: t('toast.updated') })
      } else {
        await addDoc(collection(db, 'owners'), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        toast({ title: t('toast.created') })
      }
      qc.invalidateQueries({ queryKey: ['owners'] })
      setShowForm(false)
      reset()
    } catch {
      toast({ title: t('common:errors.generic'), variant: 'destructive' })
    } finally {
      setFormLoading(false)
    }
  }

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true)
    try {
      const url = await uploadOwnerPhoto(companyId, editingOwner?.id ?? 'novos', file)
      setPhotoUrl(url)
    } catch {
      toast({ title: t('toast.photoError'), variant: 'destructive' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const filtered = owners.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase()) ||
      o.cpf?.includes(search)
  )

  const pag = usePagination(filtered, 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 sm:w-64"
          />
        </div>
        <Button onClick={() => { setEditingOwner(null); reset({}); setPhotoUrl(''); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" /> {t('new')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <Home className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">{t('empty.noResults')}</p>
          <Button className="mt-4" onClick={() => { setEditingOwner(null); reset({}); setPhotoUrl(''); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> {t('add')}
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile — cards */}
          <div className="space-y-3 md:hidden">
            {pag.pageItems.map((owner) => (
              <Card key={owner.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={owner.photoUrl} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs dark:bg-indigo-900 dark:text-indigo-300">
                          {getInitials(owner.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{owner.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {owner.cpf ? formatCPF(owner.cpf) : t('cpfMissing')}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingOwner(owner)
                          reset({ name: owner.name, cpf: owner.cpf ? maskCPF(owner.cpf) : '', email: owner.email ?? '', phone: owner.phone ? maskPhone(owner.phone) : '', whatsapp: owner.whatsapp ? maskPhone(owner.whatsapp) : '' })
                          setPhotoUrl(owner.photoUrl ?? '')
                          setShowForm(true)
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(t('toast.deleteConfirm'))) deleteMutation.mutate(owner.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {(owner.phone || owner.email) && (
                    <div className="mt-3 space-y-0.5 border-t pt-3 text-xs text-muted-foreground">
                      {owner.phone && <p>{formatPhone(owner.phone)}</p>}
                      {owner.email && <p className="truncate">{owner.email}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop — tabela */}
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('title')}</TableHead>
                  <TableHead>{t('form.cpf')}</TableHead>
                  <TableHead>{t('detail.contact')}</TableHead>
                  <TableHead className="text-right">{t('common:ui.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pag.pageItems.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={owner.photoUrl} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs dark:bg-indigo-900 dark:text-indigo-300">
                            {getInitials(owner.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{owner.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {owner.cpf ? formatCPF(owner.cpf) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {owner.phone && <p>{formatPhone(owner.phone)}</p>}
                        {owner.email && <p className="truncate max-w-40">{owner.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                            setEditingOwner(owner)
                            reset({ name: owner.name, cpf: owner.cpf ? maskCPF(owner.cpf) : '', email: owner.email ?? '', phone: owner.phone ? maskPhone(owner.phone) : '', whatsapp: owner.whatsapp ? maskPhone(owner.whatsapp) : '' })
                            setPhotoUrl(owner.photoUrl ?? '')
                            setShowForm(true)
                          }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(t('toast.deleteConfirm'))) deleteMutation.mutate(owner.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!isLoading && filtered.length > 0 && (
        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          total={pag.total}
          rangeStart={pag.rangeStart}
          rangeEnd={pag.rangeEnd}
          onPageChange={pag.setPage}
          itemLabel={t('itemLabel')}
        />
      )}

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) reset() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOwner ? t('edit') : t('new')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <ReceiptUpload
              label={t('photoLabel')}
              value={photoUrl}
              onChange={(v) => setPhotoUrl(v ?? '')}
              onFileSelect={handlePhotoUpload}
              uploading={uploadingPhoto}
              accept="image/*"
            />
            <div className="space-y-2">
              <Label>{t('form.name')} *</Label>
              <Input placeholder={t('placeholders.name')} className={fieldErrorClass(errors.name)} {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('form.cpf')}</Label>
              <Input
                placeholder="000.000.000-00"
                className={fieldErrorClass(errors.cpf)}
                {...register('cpf')}
                onChange={(e) => setValue('cpf', maskCPF(e.target.value))}
              />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('form.email')}</Label>
              <Input type="email" placeholder={t('placeholders.email')} className={fieldErrorClass(errors.email)} {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('form.phone')}</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  className={fieldErrorClass(errors.phone)}
                  {...register('phone')}
                  onChange={(e) => setValue('phone', maskPhone(e.target.value))}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('form.whatsapp')}</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  className={fieldErrorClass(errors.whatsapp)}
                  {...register('whatsapp')}
                  onChange={(e) => setValue('whatsapp', maskPhone(e.target.value))}
                />
                {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp.message}</p>}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingOwner ? t('common:actions.save') : t('register')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
