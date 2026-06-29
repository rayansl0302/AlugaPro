import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw, CheckCircle, Maximize2, Minimize2, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onConfirm: (dataUrl: string) => void
  onClear?: () => void
  value?: string
  label?: string
  className?: string
}

interface Snapshot {
  dataUrl: string
  width: number
  height: number
}

export function SignatureCanvas({ onConfirm, onClear, value, label, className }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawingRef = useRef(false)
  const hasStrokesRef = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [confirmed, setConfirmed] = useState(!!value)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPortrait, setIsPortrait] = useState(window.innerWidth < window.innerHeight)

  // (Re)dimensiona o buffer interno do canvas pro tamanho real renderizado.
  // Se vier um "preserve" (snapshot do que já estava desenhado), redesenha
  // mantendo a proporção original em vez de esticar — importante ao
  // entrar/sair da tela cheia, onde o formato do canvas muda bastante.
  const setupCanvas = useCallback((preserve: Snapshot | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      requestAnimationFrame(() => setupCanvas(preserve))
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

    const source = preserve ?? (value ? { dataUrl: value, width: rect.width, height: rect.height } : null)
    if (source) {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(rect.width / source.width, rect.height / source.height, 1)
        const w = source.width * scale
        const h = source.height * scale
        ctx.drawImage(img, (rect.width - w) / 2, (rect.height - h) / 2, w, h)
      }
      img.src = source.dataUrl
    }
  }, [value])

  useEffect(() => {
    setupCanvas(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mantém uma ref sincronizada com hasStrokes — o listener nativo de
  // fullscreenchange (abaixo) é registrado uma única vez no mount, então
  // não pode depender de um closure sobre o state, que ficaria obsoleto.
  useEffect(() => {
    hasStrokesRef.current = hasStrokes
  }, [hasStrokes])

  // Sincroniza com saídas nativas da tela cheia (Esc, gesto do sistema).
  useEffect(() => {
    const handler = () => {
      // Saída nativa (Esc, gesto do sistema) — tenta capturar antes de
      // atualizar o estado, mesmo que o navegador já tenha começado a
      // encolher a viewport (melhor um esforço tardio que nenhum).
      pendingSnapshotRef.current = captureSnapshot()
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = () => setIsPortrait(window.innerWidth < window.innerHeight)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Snapshot capturado SINCRONAMENTE no clique de entrar/sair da tela cheia,
  // antes do CSS mudar de tamanho — se capturasse dentro do efeito (depois
  // do re-render), o retângulo já estaria no tamanho novo, descasado da
  // imagem antiga, e a escala saía errada.
  const pendingSnapshotRef = useRef<Snapshot | null>(null)

  const captureSnapshot = (): Snapshot | null => {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokesRef.current) return null
    const rect = canvas.getBoundingClientRect()
    return { dataUrl: canvas.toDataURL('image/png'), width: rect.width, height: rect.height }
  }

  // Redimensiona o canvas sempre que entra/sai da tela cheia, preservando o
  // que já tinha sido desenhado (sem isso o usuário perderia a assinatura
  // em andamento só por pedir mais espaço pra desenhar).
  useEffect(() => {
    setupCanvas(pendingSnapshotRef.current)
    pendingSnapshotRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen])

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

  const confirm = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onConfirm(dataUrl)
    setConfirmed(true)
    if (isFullscreen) await exitFullscreen()
  }

  // Tela cheia + paisagem são só reforço — funcionam quando o navegador
  // suporta (a maioria no Android; iOS recente em parte), mas o layout
  // expandido via CSS (isFullscreen) já dá mais espaço de qualquer forma,
  // mesmo sem suporte a nenhuma das duas APIs.
  const enterFullscreen = async () => {
    pendingSnapshotRef.current = captureSnapshot()
    try { await wrapperRef.current?.requestFullscreen() } catch { /* sem suporte — segue só com CSS */ }
    try { await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape') } catch { /* sem suporte (ex: iOS) */ }
    setIsFullscreen(true)
  }

  const exitFullscreen = async () => {
    pendingSnapshotRef.current = captureSnapshot()
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* já não estava */ }
    try { (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.() } catch { /* nada a desfazer */ }
    setIsFullscreen(false)
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        isFullscreen ? 'fixed inset-0 z-[100] flex flex-col gap-2 bg-background p-3' : cn('space-y-2', className),
      )}
    >
      {label && <p className="text-sm font-medium">{label}</p>}
      {isFullscreen && isPortrait && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <RotateCw className="h-3.5 w-3.5" /> Gire o celular pra ter mais espaço pra assinar.
        </p>
      )}
      <div className={cn(
        'relative flex-1 rounded-xl border-2 transition-colors',
        confirmed ? 'border-green-400 bg-green-50/50' : 'border-dashed border-muted-foreground/30 bg-muted/20',
        !confirmed && 'cursor-crosshair',
      )}>
        <canvas
          ref={canvasRef}
          className={cn('block touch-none', isFullscreen ? 'h-full w-full' : 'w-full')}
          style={isFullscreen ? undefined : { height: 140 }}
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
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!hasStrokes && !confirmed}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpar
        </Button>
        {!confirmed && (
          <Button type="button" size="sm" onClick={confirm} disabled={!hasStrokes}>
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Confirmar assinatura
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={isFullscreen ? undefined : 'ml-auto'}
          onClick={isFullscreen ? exitFullscreen : enterFullscreen}
        >
          {isFullscreen
            ? <><Minimize2 className="mr-1.5 h-3.5 w-3.5" /> Sair da tela cheia</>
            : <><Maximize2 className="mr-1.5 h-3.5 w-3.5" /> Tela cheia</>}
        </Button>
      </div>
    </div>
  )
}
