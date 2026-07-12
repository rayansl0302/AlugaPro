import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Copy, Edit, Trash2, Eye, Plus, ArrowUp, ArrowDown, Lock, Save, X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getContractTemplates, createContractTemplate, updateContractTemplate, deleteContractTemplate,
} from '@/services/contractTemplates'
import { getDefaultClauses, cloneClauses } from '@/lib/contractTemplates/engine'
import { ContractAssetType, ContractTemplate, ContractTemplateClause } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/useToast'

const VARIABLE_HELP = '{{valorAluguel}}, {{caucao}}, {{multa}}, {{juros}}, {{diaVencimento}}, {{indiceReajuste}}, {{foro}}, {{imovel.endereco}}, {{veiculo.placa}}, {{equipamento.descricao}}...'

interface EditorState {
  id?: string
  assetType: ContractAssetType
  name: string
  clauses: ContractTemplateClause[]
}

export function ContractTemplatesPage() {
  const { t } = useTranslation('contracts')
  const { user } = useAuth()
  const assetLabel: Record<ContractAssetType, string> = {
    imovel: t('form.property'),
    veiculo: t('form.vehicle'),
    equipamento: t('form.equipment'),
  }
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''

  const [assetType, setAssetType] = useState<ContractAssetType>('imovel')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [preview, setPreview] = useState<{ name: string; clauses: ContractTemplateClause[] } | null>(null)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['contractTemplates', companyId],
    queryFn: () => getContractTemplates(companyId),
    enabled: !!companyId,
  })

  const systemClauses = useMemo(() => getDefaultClauses(assetType), [assetType])
  const customTemplates = templates.filter((template) => template.assetType === assetType)

  const saveMutation = useMutation({
    mutationFn: async (state: EditorState) => {
      const clauses = state.clauses
        .map((c) => ({ ...c, items: c.items.map((i) => i.trim()).filter(Boolean) }))
        .filter((c) => c.title.trim() || c.items.length)
      if (state.id) {
        await updateContractTemplate(state.id, { name: state.name.trim(), clauses })
        return
      }
      await createContractTemplate({
        companyId,
        assetType: state.assetType,
        name: state.name.trim() || t('templates.myModel', { asset: assetLabel[state.assetType] }),
        clauses,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractTemplates'] })
      toast({ title: t('templates.toast.saved') })
      setEditor(null)
    },
    onError: () => toast({ title: t('templates.toast.saveError'), variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteContractTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractTemplates'] })
      toast({ title: t('templates.toast.deleted') })
    },
    onError: () => toast({ title: t('templates.toast.deleteError'), variant: 'destructive' }),
  })

  const openClone = () => {
    setEditor({
      assetType,
      name: t('templates.myModel', { asset: assetLabel[assetType] }),
      clauses: cloneClauses(systemClauses),
    })
  }

  const openEdit = (template: ContractTemplate) => {
    setEditor({ id: template.id, assetType: template.assetType, name: template.name, clauses: cloneClauses(template.clauses) })
  }

  const handleDelete = (template: ContractTemplate) => {
    if (confirm(t('templates.toast.deleteConfirm', { name: template.name }))) {
      deleteMutation.mutate(template.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">{t('templates.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('templates.subtitle')}
          </p>
        </div>
        <Button onClick={openClone}>
          <Copy className="mr-2 h-4 w-4" /> {t('templates.cloneSystem')}
        </Button>
      </div>

      <Tabs value={assetType} onValueChange={(v) => setAssetType(v as ContractAssetType)}>
        <TabsList>
          <TabsTrigger value="imovel">{t('form.property')}</TabsTrigger>
          <TabsTrigger value="veiculo">{t('form.vehicle')}</TabsTrigger>
          <TabsTrigger value="equipamento">{t('form.equipment')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Modelo do sistema (somente leitura) */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              {t('templates.systemModel')}
              <Badge variant="secondary" className="ml-auto gap-1">
                <Lock className="h-3 w-3" /> {t('templates.default')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('templates.systemDescription', { asset: assetLabel[assetType].toLowerCase(), count: systemClauses.length })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPreview({ name: t('templates.systemPreviewName', { asset: assetLabel[assetType] }), clauses: systemClauses })}
              >
                <Eye className="mr-1 h-3.5 w-3.5" /> {t('templates.preview')}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={openClone}>
                <Copy className="mr-1 h-3.5 w-3.5" /> {t('templates.clone')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modelos personalizados */}
        {isLoading ? (
          <Card className="animate-pulse"><CardContent className="h-40" /></Card>
        ) : (
          customTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{template.name}</span>
                  <Badge variant="info" className="ml-auto shrink-0">{t('templates.custom')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t('templates.clausesCount', { count: template.clauses.length })}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPreview({ name: template.name, clauses: template.clauses })}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" /> {t('templates.view')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Editor */}
      <Dialog open={!!editor} onOpenChange={(open) => { if (!open) setEditor(null) }}>
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor?.id ? t('templates.editTitle') : t('templates.newTitle')}</DialogTitle>
          </DialogHeader>
          {editor && (
            <ClauseEditor
              state={editor}
              onChange={setEditor}
              onSave={() => saveMutation.mutate(editor)}
              onCancel={() => setEditor(null)}
              saving={saveMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null) }}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {preview?.clauses.map((c, i) => (
              <div key={c.id}>
                <p className="text-sm font-semibold">{t('templates.clauseTitle', { n: i + 1, title: c.title })}</p>
                <div className="mt-1 space-y-1">
                  {c.items.map((item, j) => (
                    <p key={j} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{i + 1}.{j + 1}</span> {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface EditorProps {
  state: EditorState
  onChange: (s: EditorState) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}

function ClauseEditor({ state, onChange, onSave, onCancel, saving }: EditorProps) {
  const { t } = useTranslation('contracts')
  const { t: tCommon } = useTranslation('common')
  const setClauses = (clauses: ContractTemplateClause[]) => onChange({ ...state, clauses })

  const updateClause = (idx: number, patch: Partial<ContractTemplateClause>) => {
    setClauses(state.clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= state.clauses.length) return
    const next = [...state.clauses]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setClauses(next)
  }

  const removeClause = (idx: number) => setClauses(state.clauses.filter((_, i) => i !== idx))

  const addClause = () => {
    setClauses([...state.clauses, { id: `c${Date.now()}`, title: t('templates.newClause'), items: [''] }])
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('templates.modelName')}</Label>
        <Input value={state.name} onChange={(e) => onChange({ ...state, name: e.target.value })} />
      </div>

      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        {t('templates.variablesHelp', { vars: VARIABLE_HELP })}
        <br />{t('templates.variablesHelpLine2')}
      </p>

      <div className="space-y-3">
        {state.clauses.map((c, idx) => (
          <div key={c.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">{t('templates.clauseLabel', { n: idx + 1 })}</span>
              <Input
                value={c.title}
                onChange={(e) => updateClause(idx, { title: e.target.value })}
                className="h-8"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title={t('templates.moveUp')} onClick={() => move(idx, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title={t('templates.moveDown')} onClick={() => move(idx, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive"
                title={t('templates.removeClause')}
                onClick={() => removeClause(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={c.items.join('\n')}
              onChange={(e) => updateClause(idx, { items: e.target.value.split('\n') })}
              placeholder={t('templates.itemPlaceholder')}
            />
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full" onClick={addClause}>
        <Plus className="mr-2 h-4 w-4" /> {t('templates.addClause')}
      </Button>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" /> {tCommon('actions.cancel')}
        </Button>
        <Button onClick={onSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? t('templates.saving') : t('templates.save')}
        </Button>
      </div>
    </div>
  )
}
