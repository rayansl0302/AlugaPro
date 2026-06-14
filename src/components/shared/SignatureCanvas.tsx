import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onConfirm: (dataUrl: string) => void
  onClear?: () => void
  value?: string
  label?: string
  className?: string
}

export function SignatureCanvas({ onConfirm, onClear, value, label, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [confirmed, setConfirmed] = useState(!!value)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Set resolution for retina
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // If there's an existing value, draw it as image
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
      img.src = value
    }
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (confirmed) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    setHasStrokes(true)
    const pos = getPos(e, canvas)
    lastPos.current = pos
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [confirmed])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || confirmed) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }, [drawing, confirmed])

  const endDraw = useCallback(() => {
    setDrawing(false)
    lastPos.current = null
  }, [])

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr)
    setHasStrokes(false)
    setConfirmed(false)
    onClear?.()
  }

  const confirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onConfirm(dataUrl)
    setConfirmed(true)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className={cn(
        'relative rounded-xl border-2 transition-colors',
        confirmed ? 'border-green-400 bg-green-50/50' : 'border-dashed border-muted-foreground/30 bg-muted/20',
        !confirmed && 'cursor-crosshair',
      )}>
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ height: 140 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasStrokes && !confirmed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground/60 select-none">Assine aqui</p>
          </div>
        )}
        {confirmed && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle className="h-3 w-3" /> Confirmada
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!hasStrokes && !confirmed}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpar
        </Button>
        {!confirmed && (
          <Button type="button" size="sm" onClick={confirm} disabled={!hasStrokes}>
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Confirmar assinatura
          </Button>
        )}
      </div>
    </div>
  )
}
