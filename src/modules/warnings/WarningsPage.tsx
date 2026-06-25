import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileWarning, Plus, Search, Trash2, Music, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getWarningsByCompany, deleteWarning } from '@/services/warnings'
import { formatDate } from '@/lib/utils'
import { ContractWarning } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'
import { WarningForm } from './WarningForm'

const RESCISSION_THRESHOLD = 4

export function WarningsPage() {
  const { user, firebaseUser } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [presetContractId, setPresetContractId] = useState<string | undefined>(undefined)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ['warnings', companyId],
    queryFn: () => getWarningsByCompany(companyId),
    enabled: !!companyId,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWarning,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warnings'] })
      toast({ title: 'Advertência removida.' })
    },
    onError: () => toast({ title: 'Erro ao remover advertência.', variant: 'destructive' }),
  })

  const filtered = warnings.filter((w) =>
    (w.tenantName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (w.propertyName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    w.reason.toLowerCase().includes(search.toLowerCase())
  )

  // Agrupa por inquilino (mesmo padrão de DefaultersPage)
  const byTenant = filtered.reduce<Record<string, ContractWarning[]>>((acc, w) => {
    if (!acc[w.tenantId]) acc[w.tenantId] = []
    acc[w.tenantId].push(w)
    return acc
  }, {})
  const tenantGroups = Object.entries(byTenant).sort((a, b) => b[1].length - a[1].length)

  const pag = usePagination(tenantGroups, 10)

  const handleDelete = (w: ContractWarning) => {
    if (confirm('Remover esta advertência? Esta ação não pode ser desfeita.')) {
      deleteMutation.mutate(w.id)
    }
  }

  const openNew = (contractId?: string) => {
    setPresetContractId(contractId)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar inquilino ou imóvel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 sm:w-64"
          />
        </div>
        <Button onClick={() => openNew(undefined)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Advertência
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{warnings.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total de advertências</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{Object.keys(byTenant).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Inquilinos advertidos</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {Object.values(byTenant).filter((w) => w.length >= RESCISSION_THRESHOLD).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Em risco de rescisão (≥4)</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-24 p-6" /></Card>
          ))}
        </div>
      ) : tenantGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <FileWarning className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Nenhuma advertência registrada</p>
          <p className="text-sm text-muted-foreground">Ótimo sinal — nenhum inquilino foi advertido até agora.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pag.pageItems.map(([tenantId, items]) => {
            const atRisk = items.length >= RESCISSION_THRESHOLD
            const tenantName = items[0].tenantName || 'Inquilino'
            const propertyName = items[0].propertyName
            return (
              <Card key={tenantId} className={atRisk ? 'border-l-4 border-l-destructive overflow-hidden' : 'overflow-hidden'}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                  <div>
                    <CardTitle className="text-base">{tenantName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{propertyName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={atRisk ? 'destructive' : 'warning'} className="gap-1">
                      {atRisk && <ShieldAlert className="h-3 w-3" />}
                      {items.length} advertência{items.length > 1 ? 's' : ''}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => openNew(items[0].contractId)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Advertir
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {atRisk && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      Limite de 4 advertências atingido — o proprietário pode rescindir o contrato imediatamente, sem devolução dos valores pagos, conforme cláusula contratual.
                    </p>
                  )}
                  {items.map((w) => (
                    <div key={w.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {w.clauseReference && (
                            <p className="text-xs font-medium text-primary">{w.clauseReference}</p>
                          )}
                          <p className="text-sm">{w.reason}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(w.createdAt?.toDate ? w.createdAt.toDate().toISOString() : new Date().toISOString())} — por {w.issuedByName}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          title="Remover"
                          onClick={() => handleDelete(w)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {((w.evidencePhotos?.length ?? 0) > 0 || (w.evidenceAudio?.length ?? 0) > 0) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(w.evidencePhotos ?? []).map((url, idx) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setLightbox({ photos: w.evidencePhotos ?? [], index: idx })}
                              className="h-12 w-12 overflow-hidden rounded-md border"
                            >
                              <img src={url} alt="Prova" className="h-full w-full object-cover" />
                            </button>
                          ))}
                          {(w.evidenceAudio?.length ?? 0) > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Music className="h-3.5 w-3.5" /> {w.evidenceAudio?.length} áudio(s)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!isLoading && tenantGroups.length > 0 && (
        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          total={pag.total}
          rangeStart={pag.rangeStart}
          rangeEnd={pag.rangeEnd}
          onPageChange={pag.setPage}
          itemLabel="inquilinos"
        />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5" /> Nova Advertência
            </DialogTitle>
          </DialogHeader>
          <WarningForm
            companyId={companyId}
            issuedById={firebaseUser?.uid ?? user?.id ?? ''}
            issuedByName={user?.name ?? 'Gestor'}
            presetContractId={presetContractId}
            onSuccess={() => {
              setShowForm(false)
              qc.invalidateQueries({ queryKey: ['warnings'] })
            }}
          />
        </DialogContent>
      </Dialog>

      <PhotoLightbox
        photos={lightbox?.photos ?? []}
        open={!!lightbox}
        startIndex={lightbox?.index ?? 0}
        onClose={() => setLightbox(null)}
      />
    </div>
  )
}
