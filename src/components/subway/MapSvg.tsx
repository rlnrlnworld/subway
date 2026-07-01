'use client'
import { memo } from 'react'
import { activeLines, activeStationsByLine, dotGroups, lineColorMap, terminals, viewBox } from './data'
import { badgePos, computeTangent, labelLayout } from './geometry'
import {
  BADGE_R,
  BADGE_CORNER,
  DOT_INNER_R,
  DOT_OUTER_R,
  LABEL_FONT,
  TRANSFER_PILL_DOT_R,
  TRANSFER_PILL_GAP,
  TRANSFER_PILL_PAD,
  TRANSFER_PILL_STROKE,
  ACTIVE_LINES,
} from './config'
import { LABEL_WRAP, TRANSFER_PILL_ORIENTATION } from './overrides'
import type { PillOrientation } from './types'

export const MapSvg = memo(function MapSvg({ onClick }: { onClick: (e: React.MouseEvent<SVGSVGElement>) => void }) {
  return (
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="block max-w-full max-h-full w-full h-full"
      onClick={onClick}
    >
      {activeLines.map(line => (
        <g key={line.name} stroke={line.color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {(activeStationsByLine.get(line.name) ?? []).flatMap(s => {
            const paths = []
            if (s.pathUp) paths.push(<path key={`${s.id}-up`} d={s.pathUp} />)
            if (s.pathDown) paths.push(<path key={`${s.id}-down`} d={s.pathDown} />)
            return paths
          })}
        </g>
      ))}

      <g>
        {dotGroups.filter(g => g.lines.length < 2).map(g => (
          <g
            key={g.key}
            className="station-dot"
            data-key={g.key}
            data-name={g.name}
            data-x={g.x}
            data-y={g.y}
            style={{ transformOrigin: `${g.x}px ${g.y}px` }}
          >
            <circle cx={g.x} cy={g.y} r={DOT_OUTER_R} fill="white" />
            <circle cx={g.x} cy={g.y} r={DOT_INNER_R} fill={lineColorMap.get(g.lines[0]) ?? '#888'} />
          </g>
        ))}
      </g>

      <g>
        {dotGroups.filter(g => g.lines.length >= 2).map(g => {
          const override = TRANSFER_PILL_ORIENTATION[g.name]
          let orientation: PillOrientation
          if (override) {
            orientation = override
          } else {
            let sumDx = 0, sumDy = 0
            for (const s of g.stations) {
              const t = computeTangent(s.pathUp) ?? computeTangent(s.pathDown)
              if (!t) continue
              sumDx += Math.abs(t.dx)
              sumDy += Math.abs(t.dy)
            }
            orientation = sumDy > sumDx ? 'vertical' : 'horizontal'
          }
          const sortedLines = [...g.lines].sort(
            (a, b) => ACTIVE_LINES.indexOf(a) - ACTIVE_LINES.indexOf(b)
          )
          const n = sortedLines.length
          const r = TRANSFER_PILL_DOT_R
          const span = n * 2 * r + (n - 1) * TRANSFER_PILL_GAP
          const cross = 2 * r
          const isVertical = orientation === 'vertical'
          const w = isVertical ? cross + 2 * TRANSFER_PILL_PAD : span + 2 * TRANSFER_PILL_PAD
          const h = isVertical ? span + 2 * TRANSFER_PILL_PAD : cross + 2 * TRANSFER_PILL_PAD
          const rectX = g.x - w / 2
          const rectY = g.y - h / 2
          const rx = Math.min(w, h) / 2
          const rotate = orientation === 'diag-up' ? -45 : orientation === 'diag-down' ? 45 : 0
          return (
            <g
              key={`${g.key}-t`}
              className="station-dot"
              data-key={g.key}
              data-name={g.name}
              data-x={g.x}
              data-y={g.y}
              style={{ transformOrigin: `${g.x}px ${g.y}px` }}
            >
              <g transform={rotate ? `rotate(${rotate} ${g.x} ${g.y})` : undefined}>
                <rect
                  x={rectX}
                  y={rectY}
                  width={w}
                  height={h}
                  rx={rx}
                  ry={rx}
                  fill="white"
                  stroke="#111"
                  strokeWidth={TRANSFER_PILL_STROKE}
                />
                {sortedLines.map((ln, i) => {
                  const offset = -span / 2 + r + i * (2 * r + TRANSFER_PILL_GAP)
                  const cx = isVertical ? g.x : g.x + offset
                  const cy = isVertical ? g.y + offset : g.y
                  return (
                    <circle
                      key={`${ln}-${i}`}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={lineColorMap.get(ln) ?? '#888'}
                      stroke="white"
                      strokeWidth={0.6}
                    />
                  )
                })}
              </g>
            </g>
          )
        })}
      </g>

      <g style={{ pointerEvents: 'none' }}>
        {dotGroups.map(g => {
          const l = labelLayout(g.stations[0], g.x, g.y)
          const isTransfer = g.lines.length >= 2
          const fontSize = isTransfer ? LABEL_FONT + 1.6 : LABEL_FONT
          const wrap = LABEL_WRAP[g.name]
          const text = g.name.replace(/\(.+?\)/g, '')
          return (
            <text
              key={`${g.key}-label`}
              x={l.x}
              y={l.y}
              textAnchor={l.textAnchor}
              dominantBaseline={l.baseline}
              fontSize={fontSize}
              fill="#111"
              fontWeight={isTransfer ? 800 : 500}
              paintOrder="stroke"
              stroke="white"
              strokeWidth={1.4}
              strokeLinejoin="round"
              transform={l.rotation ? `rotate(${l.rotation} ${l.x} ${l.y})` : undefined}
            >
              {wrap
                ? wrap.map((line, i) => (
                    <tspan key={i} x={l.x} dy={i === 0 ? 0 : fontSize + 1}>{line}</tspan>
                  ))
                : text}
            </text>
          )
        })}
      </g>

      <g style={{ pointerEvents: 'none' }}>
        {terminals.map(s => {
          const line = activeLines.find(l => l.name === s.line)
          if (!line) return null
          const pos = badgePos(s)
          const fontSize = line.label.length === 1 ? 8 : line.label.length === 2 ? 5 : 4
          const size = BADGE_R * 2
          return (
            <g key={`${s.id}-badge`}>
              <rect
                x={pos.x - BADGE_R}
                y={pos.y - BADGE_R}
                width={size}
                height={size}
                rx={BADGE_CORNER}
                ry={BADGE_CORNER}
                fill={line.color}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fill="white"
                fontWeight={700}
              >
                {line.label}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
})
