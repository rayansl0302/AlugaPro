import { useRef, useState } from 'react'
import { Upload, Loader2, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface MultiPhotoUploadProps {
  label?: string
  value: string[]
  onUpload: (file: File) => Promise<string>
  onChange: (urls: string[]) => void
  max?: number
}

export function MultiPhotoUpload({
  label = 'Fotos',
  value,
  onUpload,
  onChange,
  max = 10,
}: MultiPhotoUploadProps) {
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
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url, idx) => (
          <div key={`${url}-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/30">
            <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
              aria-label="Remover foto"
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
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors',
              uploading ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/50 hover:bg-muted/30',
            )}
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            <span className="text-xs">{uploading ? 'Enviando' : 'Adicionar'}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
