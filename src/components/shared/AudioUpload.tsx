import { useRef, useState } from 'react'
import { Upload, Loader2, X, Music } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface AudioUploadProps {
  label?: string
  value: string[]
  onUpload: (file: File) => Promise<string>
  onChange: (urls: string[]) => void
  max?: number
}

export function AudioUpload({
  label = 'Áudios',
  value,
  onUpload,
  onChange,
  max = 5,
}: AudioUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: FileList) => {
    const remaining = max - value.length
    const toUpload = Array.from(files).slice(0, Math.max(0, remaining))
    if (toUpload.length === 0) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of toUpload) {
        const url = await onUpload(file)
        if (url) urls.push(url)
      }
      onChange([...value, ...urls])
    } finally {
      setUploading(false)
    }
  }

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-2">
        {value.map((url, idx) => (
          <div key={`${url}-${idx}`} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
            <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
            <audio controls src={url} className="h-8 flex-1" />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remover áudio"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm text-muted-foreground transition-colors',
              uploading ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/50 hover:bg-muted/30',
            )}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Enviando...' : 'Adicionar áudio'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
