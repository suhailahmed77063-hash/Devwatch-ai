// Lightweight, dependency-free SVG charts.

// Smooth-ish area line chart with markers and horizontal gridlines.
export function LineChart({ data = [], height = 180, color = '#0d9488', className = '' }) {
  const w = 520
  const h = height
  const padX = 28
  const padY = 20
  const max = Math.max(...data.map((d) => d.value), 1)
  const maxTick = Math.ceil(max / 10) * 10 || 10
  const innerW = w - padX * 2
  const innerH = h - padY * 2
  const stepX = innerW / (data.length - 1 || 1)
  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padY + innerH - (d.value / maxTick) * innerH,
    ...d,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1]?.x} ${padY + innerH} L ${points[0]?.x} ${padY + innerH} Z`
  const ticks = [0, 10, 20, 30, 40].filter((t) => t <= maxTick)

  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className={`w-full ${className}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => {
        const y = padY + innerH - (t / maxTick) * innerH
        return (
          <g key={t}>
            <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="#eef2f7" strokeWidth="1" />
            <text x={4} y={y + 3} fontSize="9" fill="#94a3b8">{t}</text>
          </g>
        )
      })}
      <path d={areaPath} fill="url(#lineArea)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {points.map((p) => (
        <text key={p.label} x={p.x} y={h + 12} fontSize="10" fill="#94a3b8" textAnchor="middle">
          {p.label}
        </text>
      ))}
    </svg>
  )
}

// Donut chart with a centered label.
export function DonutChart({ segments = [], size = 150, thickness = 22, centerTop, centerBottom }) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let offset = 0
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((seg) => {
          const len = (seg.value / total) * c
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
      </svg>
      {(centerTop || centerBottom) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-navy-900">{centerTop}</span>
          {centerBottom && <span className="text-2xs text-slate-400">{centerBottom}</span>}
        </div>
      )}
    </div>
  )
}

// Tiny sparkline for trend tiles.
export function Sparkline({ data = [], color = '#10b981', width = 80, height = 30 }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const step = width / (data.length - 1 || 1)
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ')
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
