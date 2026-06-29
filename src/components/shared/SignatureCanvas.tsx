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
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawingRef = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [confirmed, setConfirmed] = useState(!!value)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      // Se o layout ainda não assentou (rect zerado), tenta de novo no
      // próximo frame em vez de inicializar um buffer de tamanho errado.
      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(setup)
        return
      }
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctxRef.current = ctx

      if (value) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
        img.src = value
      }
    }
    setup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPos = (e: React.PointerEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  // Pointer capture mantém o traço seguindo o mesmo dedo/ponteiro mesmo se
  // ele sair momentaneamente da área do canvas — sem isso, qualquer
  // pequeno desvio durante a assinatura corta o traço no meio (é
  // exatamente o que causa a sensação de "quebra entre letras").
  const startDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (confirmed) return
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    // setPointerCapture pode falhar em alguns navegadores/cenários — não
    // deve impedir o desenho de funcionar, só perde a robustez extra.
    try { canvas.setPointerCapture(e.pointerId) } catch { /* segue sem capture */ }
    drawingRef.current = true
    setHasStrokes(true)
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    // Garante que um toque rápido sem arrastar (ex: o pingo de um "i")
    // deixe uma marca visível — beginPath+moveTo isolados não desenham nada.
    ctx.lineTo(pos.x + 0.01, pos.y + 0.01)
    ctx.stroke()
  }, [confirmed])

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || confirmed) return
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [confirmed])

  const endDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false
    try {
      const canvas = canvasRef.current
      if (canvas?.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    } catch { /* sem capture ativo — nada a liberar */ }
  }, [])

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
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
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
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
