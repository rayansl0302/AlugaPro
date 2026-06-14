import { useRef, useState } from 'react'
import { Upload, Loader2, FileImage, X, ExternalLink, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ReceiptUploadProps {
  value?: string
  onChange: (url: string | undefined) => void
  onFileSelect: (file: File) => Promise<void>
  uploading?: boolean
  label?: string
  accept?: string
}

export function ReceiptUpload({
  value,
  onChange,
  onFileSelect,
  uploading = false,
  label = 'Comprovante',
  accept = 'image/*,application/pdf',
}: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!file) return
    await onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const isImage = value && /\.(jpg|jpeg|png|webp|gif)/i.test(value)
  const isPDF = value && /\.pdf/i.test(value)
  // object URLs from fallback may not have extension
  const isObjectUrl = value?.startsWith('blob:')

  if (value) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="relative overflow-hidden rounded-lg border bg-muted/30">
          {(isImage || isObjectUrl) ? (
            <img
              src={value}
              alt="Comprovante"
              className="max-h-48 w-full object-contain"
            />
          ) : isPDF ? (
            <div className="flex items-center gap-3 p-4">
              <FileImage className="h-8 w-8 text-red-500" />
              <span className="text-sm font-medium">Comprovante PDF</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <span className="text-sm font-medium">Comprovante enviado</span>
            </div>
          )}
          <div className="absolute right-2 top-2 flex gap-1">
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white hover:bg-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
          uploading && 'cursor-not-allowed opacity-60'
        )}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {uploading ? 'Enviando...' : 'Clique ou arraste o arquivo'}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, PDF — máx. 10 MB
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
