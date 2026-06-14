import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, Search, Home, Edit, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Owner } from '@/types'
import { uploadOwnerPhoto } from '@/services/storage'
import { formatCPF, formatPhone, getInitials } from '@/lib/utils'
// Phone/Mail used in card variant below
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ReceiptUpload } from '@/components/shared/ReceiptUpload'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  name: z.string().min(2, 'Nome obrigatório'),
  cpf: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function OwnersPage() {
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
      toast({ title: 'Proprietário removido.' })
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {},
  })

  const onSubmit = async (data: FormData) => {
    setFormLoading(true)
    try {
      const payload = { companyId, ...data, photoUrl: photoUrl || '', active: true }
      if (editingOwner) {
        await updateDoc(doc(db, 'owners', editingOwner.id), { ...payload, updatedAt: serverTimestamp() })
        toast({ title: 'Proprietário atualizado.' })
      } else {
        await addDoc(collection(db, 'owners'), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        toast({ title: 'Proprietário cadastrado.' })
      }
      qc.invalidateQueries({ queryKey: ['owners'] })
      setShowForm(false)
      reset()
    } catch {
      toast({ title: 'Erro ao salvar.', variant: 'destructive' })
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
      toast({ title: 'Erro ao enviar a foto.', variant: 'destructive' })
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar proprietários..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-9"
          />
        </div>
        <Button onClick={() => { setEditingOwner(null); reset({}); setPhotoUrl(''); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Proprietário
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
          <p className="mt-4 text-lg font-medium text-muted-foreground">Nenhum proprietário encontrado</p>
          <Button className="mt-4" onClick={() => { setEditingOwner(null); reset({}); setPhotoUrl(''); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Proprietário
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proprietário</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((owner) => (
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
                          reset({ name: owner.name, cpf: owner.cpf ?? '', email: owner.email ?? '', phone: owner.phone ?? '', whatsapp: owner.whatsapp ?? '' })
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
                          if (confirm('Remover proprietário?')) deleteMutation.mutate(owner.id)
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
      )}

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) reset() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOwner ? 'Editar Proprietário' : 'Novo Proprietário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <ReceiptUpload
              label="Foto do proprietário"
              value={photoUrl}
              onChange={(v) => setPhotoUrl(v ?? '')}
              onFileSelect={handlePhotoUpload}
              uploading={uploadingPhoto}
              accept="image/*"
            />
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input placeholder="Maria Silva" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input placeholder="000.000.000-00" {...register('cpf')} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" placeholder="maria@email.com" {...register('email')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input placeholder="(00) 00000-0000" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input placeholder="(00) 00000-0000" {...register('whatsapp')} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingOwner ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
