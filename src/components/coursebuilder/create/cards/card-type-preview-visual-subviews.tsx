import { Sparkles } from "lucide-react"

export function AnimationPreview({ format, duration, fps }: { format: string; duration: string; fps: number }) {
  const blobs = [
    { cx: 80, cy: 80, r: 38, delay: "0s", op: 0.22, dur: "2.8s" },
    { cx: 170, cy: 55, r: 28, delay: "0.4s", op: 0.38, dur: "2.8s" },
    { cx: 245, cy: 100, r: 22, delay: "0.8s", op: 0.28, dur: "2.8s" },
    { cx: 140, cy: 145, r: 18, delay: "1.2s", op: 0.48, dur: "2.8s" },
    { cx: 55, cy: 150, r: 14, delay: "1.6s", op: 0.32, dur: "2.8s" },
    { cx: 180, cy: 150, r: 32, delay: "0.6s", op: 0.14, dur: "3.4s" },
    { cx: 65, cy: 44, r: 22, delay: "1.0s", op: 0.18, dur: "3.4s" },
    { cx: 272, cy: 155, r: 16, delay: "1.8s", op: 0.28, dur: "3.4s" },
  ]

  return (
    <div>
      <svg viewBox="0 0 300 200" width="100%" className="select-none" style={{ height: 160 }}>
        {blobs.map((b, i) => (
          <circle
            key={i}
            cx={b.cx}
            cy={b.cy}
            r={b.r}
            fill="hsl(var(--primary))"
            fillOpacity={b.op}
            style={{
              animationName: "animFloat",
              animationDuration: b.dur,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDirection: "alternate",
              animationDelay: b.delay,
            }}
          />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        {format && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{format}</span>}
        {duration && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{duration}</span>}
        {fps > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{fps} fps</span>}
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Loop</span>
      </div>
    </div>
  )
}

export function MapPreview({ lat, lng, zoom, layers }: { lat: number; lng: number; zoom: number; layers: string[] }) {
  const W = 380
  const H = 200
  const gH = [35, 75, 105, 135, 168]
  const gV = [48, 100, 152, 200, 248, 296, 340]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 160, background: "hsl(var(--muted)/0.3)" }} className="select-none">
        {gH.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="hsl(var(--border))" strokeWidth={0.7} />)}
        {gV.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="hsl(var(--border))" strokeWidth={0.7} />)}
        <path d="M20,62 Q55,44 90,56 Q112,68 104,90 Q88,108 62,97 Q24,88 20,62Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <path d="M103,38 Q162,22 202,44 Q225,62 206,86 Q175,108 146,92 Q103,74 103,38Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <path d="M210,52 Q244,40 272,56 Q290,74 274,96 Q252,114 226,99 Q207,82 210,52Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <path d="M103,116 Q132,100 155,115 Q168,133 148,148 Q124,158 100,144 Q84,130 103,116Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <path d="M196,120 Q228,112 250,128 Q256,144 238,154 Q213,160 194,146 Q184,132 196,120Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <circle cx={W / 2} cy={H / 2} r={14} fill="hsl(var(--primary)/0.15)" />
        <circle cx={W / 2} cy={H / 2} r={5} fill="hsl(var(--primary))" />
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground font-mono">{lat.toFixed(1)}°, {lng.toFixed(1)}°</span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Zoom {zoom}</span>
        {layers.map((l) => <span key={l} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{l}</span>)}
      </div>
    </div>
  )
}

export function ChartPreview({ chartType, xLabel, yLabel, source }: { chartType: string; xLabel: string; yLabel: string; source: string }) {
  const vals = [-0.16, -0.08, -0.11, -0.17, -0.28, -0.33, -0.14, 0.02, 0.19, 0.32, 0.54, 0.62, 0.98, 1.02]
  const W = 380
  const H = 168
  const pX = 36
  const pY = 16
  const iW = W - pX * 2
  const iH = H - pY * 2 - 14
  const minV = -0.5
  const maxV = 1.25
  const px = (i: number) => pX + (i / (vals.length - 1)) * iW
  const py = (v: number) => pY + iH - ((v - minV) / (maxV - minV)) * iH
  const linePath = vals.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L${px(vals.length - 1).toFixed(1)},${(pY + iH).toFixed(1)} L${px(0).toFixed(1)},${(pY + iH).toFixed(1)}Z`
  const zeroY = py(0)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 150 }} className="select-none">
        <line x1={pX} y1={zeroY} x2={W - pX} y2={zeroY} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 3" />
        {[-0.4, 0, 0.4, 0.8, 1.2].map((v) => (
          <g key={v}>
            <line x1={pX - 4} y1={py(v)} x2={pX} y2={py(v)} stroke="hsl(var(--border))" strokeWidth={0.8} />
            <text x={pX - 6} y={py(v) + 4} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground)/0.7)">{v > 0 ? `+${v}` : v}</text>
          </g>
        ))}
        <path d={areaPath} fill="hsl(var(--primary)/0.08)" />
        <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {vals.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r={2.5} fill="hsl(var(--primary))" />)}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground capitalize">{chartType}</span>
        {xLabel && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">x: {xLabel}</span>}
        {yLabel && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">y: {yLabel}</span>}
        {source && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Source: {source}</span>}
      </div>
    </div>
  )
}

export function DiagramPreview({ diagramType, nodes, edges }: { diagramType: string; nodes: number; edges: number }) {
  const W = 380
  const H = 228
  const nodeData = [
    { id: "a", label: "Acetyl CoA", x: 190, y: 28, w: 94, h: 26 },
    { id: "b", label: "Citrate", x: 320, y: 80, w: 72, h: 26 },
    { id: "c", label: "Isocitrate", x: 332, y: 150, w: 82, h: 26 },
    { id: "d", label: "α-Ketoglutarate", x: 230, y: 198, w: 114, h: 26 },
    { id: "e", label: "Malate", x: 148, y: 198, w: 64, h: 26 },
    { id: "f", label: "Fumarate", x: 46, y: 150, w: 76, h: 26 },
    { id: "g", label: "Oxaloacetate", x: 56, y: 80, w: 96, h: 26 },
  ]
  const edgePairs: [string, string][] = [["g", "a"], ["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"], ["e", "f"], ["f", "g"]]
  const byId = (id: string) => nodeData.find((n) => n.id === id)!

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 180 }} className="select-none">
        <defs>
          <marker id="dg-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 Z" fill="hsl(var(--muted-foreground)/0.45)" />
          </marker>
        </defs>
        {edgePairs.map(([from, to], i) => {
          const a = byId(from)
          const b = byId(to)
          return <line key={i} x1={a.x} y1={a.y + a.h / 2} x2={b.x} y2={b.y + b.h / 2} stroke="hsl(var(--muted-foreground)/0.35)" strokeWidth={1.4} markerEnd="url(#dg-arrow)" />
        })}
        {nodeData.map((n) => (
          <g key={n.id}>
            <rect x={n.x - n.w / 2} y={n.y} width={n.w} height={n.h} rx={7} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1.2} />
            <text x={n.x} y={n.y + n.h / 2 + 4.5} textAnchor="middle" fontSize={9.5} fill="hsl(var(--foreground)/0.85)">{n.label}</text>
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground capitalize">{diagramType}</span>
        {nodes > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{nodes} nodes</span>}
        {edges > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{edges} edges</span>}
      </div>
    </div>
  )
}

export function RichSimPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border h-40 gap-2">
      <Sparkles className="h-7 w-7 text-muted-foreground/40" />
      <span className="text-[12px] text-muted-foreground">Paste a simulation URL to preview</span>
    </div>
  )
}
