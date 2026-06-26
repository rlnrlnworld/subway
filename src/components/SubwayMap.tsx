'use client'

import { useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent, useControls, useTransformEffect } from 'react-zoom-pan-pinch'
import stations from '@/data/stations.json'
import linesData from '@/data/lines.json'

type Station = {
  id: string
  name: string
  line: string
  order: number
  x: number
  y: number
  pathUp: string | null
  pathDown: string | null
}

type Line = {
  name: string
  color: string
  label: string
  startX: number
  startY: number
}

const ACTIVE_LINES = ['1호선', '2호선', '3호선', '4호선']

const { lines: allLines } = linesData as { viewBox: { x: number; y: number; width: number; height: number }; lines: Line[] }
const allStations = stations as Station[]

const STATION_OVERRIDE: Record<string, Partial<Station>> = {
  '2호선:용두(동대문구청):4': {
    pathDown: 'M 773.8 270 H 752 C 748 270 745.9 268 745.9 264',
  },
  '2호선:신설동:5': {
    pathUp: 'M 773.8 270 H 752 C 748 270 745.9 268 745.9 264',
  },
  '2호선:신도림:1': {
    pathDown: 'M 451.9 505.9 C 451.9 499.8 449.9 497.8 446 497.8 H 412.1',
  },
  '2호선:도림천:2': {
    pathUp: 'M 451.9 505.9 C 451.9 499.8 449.9 497.8 446 497.8 H 412.1',
  },
  '4호선:회현(남대문시장):17': {
    pathDown: 'M 592 343.9 C 587.56 343.9 580.9 357.22 580.9 366.1',
  },
  '4호선:서울역:18': {
    pathUp: 'M 592 343.9 C 587.56 343.9 580.9 357.22 580.9 366.1',
    pathDown: 'M 580.9 366.1 C 580.9 374.5 586.6 387.1 590.4 387.1',
  },
  '4호선:숙대입구(갈월):19': {
    pathUp: 'M 580.9 366.1 C 580.9 374.5 586.6 387.1 590.4 387.1',
  },
  '4호선:불암산(당고개):1': {
    x: 1076.3,
    pathDown: 'M 1076.3 164.6 H 1012.1',
  },
}

const activeStations = allStations
  .filter(s => ACTIVE_LINES.includes(s.line))
  .map(s => {
    const ovr = STATION_OVERRIDE[s.id]
    return ovr ? { ...s, ...ovr } : s
  })
const activeLines = allLines.filter(l => ACTIVE_LINES.includes(l.name))
const lineColorMap = new Map(activeLines.map(l => [l.name, l.color]))
const activeStationsByLine = new Map<string, Station[]>()
for (const s of activeStations) {
  const arr = activeStationsByLine.get(s.line) ?? []
  arr.push(s)
  activeStationsByLine.set(s.line, arr)
}

const DOT_OUTER_R = 4
const DOT_INNER_R = 2.4
const TRANSFER_R = 4.5
const TRANSFER_STROKE = 1.6
const LABEL_FONT = 5
const LABEL_DIST = DOT_OUTER_R + 2.5
const BADGE_R = 9
const BADGE_OFFSET = BADGE_R + 8

type Pt = { x: number; y: number }
type Seg = { a: Pt; b: Pt }

function parseSegments(d: string | null): Seg[] {
  if (!d) return []
  const segs: Seg[] = []
  const tokens = d.match(/[a-zA-Z]|-?\d+\.?\d*/g) ?? []
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0
  const num = () => parseFloat(tokens[i++])
  while (i < tokens.length) {
    const t = tokens[i]
    if (/^[a-zA-Z]$/.test(t)) { cmd = t; i++; continue }
    let nx = x, ny = y
    let push = true
    switch (cmd) {
      case 'M': nx = num(); ny = num(); sx = nx; sy = ny; push = false; cmd = 'L'; break
      case 'm': nx = x + num(); ny = y + num(); sx = nx; sy = ny; push = false; cmd = 'l'; break
      case 'L': nx = num(); ny = num(); break
      case 'l': nx = x + num(); ny = y + num(); break
      case 'H': nx = num(); ny = y; break
      case 'h': nx = x + num(); ny = y; break
      case 'V': nx = x; ny = num(); break
      case 'v': nx = x; ny = y + num(); break
      case 'C': num(); num(); num(); num(); nx = num(); ny = num(); break
      case 'c': num(); num(); num(); num(); nx = x + num(); ny = y + num(); break
      case 'Z': case 'z': nx = sx; ny = sy; break
      default: i++; continue
    }
    if (push) segs.push({ a: { x, y }, b: { x: nx, y: ny } })
    x = nx; y = ny
  }
  return segs
}

const viewBox = (() => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of activeStations) {
    for (const p of [s.pathUp, s.pathDown]) {
      const segs = parseSegments(p)
      for (const seg of segs) {
        for (const pt of [seg.a, seg.b]) {
          if (pt.x < minX) minX = pt.x
          if (pt.y < minY) minY = pt.y
          if (pt.x > maxX) maxX = pt.x
          if (pt.y > maxY) maxY = pt.y
        }
      }
    }
  }
  const pad = BADGE_OFFSET + BADGE_R + 6
  return {
    x: Math.floor(minX - pad),
    y: Math.floor(minY - pad),
    width: Math.ceil(maxX - minX + pad * 2),
    height: Math.ceil(maxY - minY + pad * 2),
  }
})()

function computeTangent(d: string | null): { dx: number; dy: number } | null {
  if (!d) return null
  const tokens = d.match(/[a-zA-Z]|-?\d+\.?\d*/g) ?? []
  let i = 0, cmd = '', x = 0, y = 0
  const num = () => parseFloat(tokens[i++])
  while (i < tokens.length) {
    const t = tokens[i]
    if (/^[a-zA-Z]$/.test(t)) { cmd = t; i++; continue }
    switch (cmd) {
      case 'M': { x = num(); y = num(); cmd = 'L'; break }
      case 'L': { const nx = num(), ny = num(); const dx = nx - x, dy = ny - y; if (dx || dy) return { dx, dy }; x = nx; y = ny; break }
      case 'l': { const dx = num(), dy = num(); if (dx || dy) return { dx, dy }; x += dx; y += dy; break }
      case 'H': { const nx = num(); const dx = nx - x; if (dx) return { dx, dy: 0 }; x = nx; break }
      case 'h': { const dx = num(); if (dx) return { dx, dy: 0 }; x += dx; break }
      case 'V': { const ny = num(); const dy = ny - y; if (dy) return { dx: 0, dy }; y = ny; break }
      case 'v': { const dy = num(); if (dy) return { dx: 0, dy }; y += dy; break }
      case 'c': { num(); num(); num(); num(); const dx = num(), dy = num(); if (dx || dy) return { dx, dy }; x += dx; y += dy; break }
      case 'C': { num(); num(); num(); num(); const nx = num(), ny = num(); const dx = nx - x, dy = ny - y; if (dx || dy) return { dx, dy }; x = nx; y = ny; break }
      default: i++
    }
  }
  return null
}

type LabelLayout = {
  x: number
  y: number
  textAnchor: 'start' | 'middle' | 'end'
  baseline: 'alphabetic' | 'central' | 'hanging'
  rotation?: number
}

type DotGroup = {
  key: string
  x: number
  y: number
  name: string
  lines: string[]
  stations: Station[]
}

function intersectSeg(s1: Seg, s2: Seg): Pt | null {
  const { a: p1, b: p2 } = s1
  const { a: p3, b: p4 } = s2
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)
  if (Math.abs(denom) < 1e-9) return null
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) }
}

const TRANSFER_DIST = 30

const DOT_POS_OVERRIDE: Record<string, { x?: number; y?: number }> = {
  '신설동': { y: 264 },
}

const dotGroups: DotGroup[] = (() => {
  const byName = new Map<string, Station[]>()
  for (const s of activeStations) {
    const arr = byName.get(s.name) ?? []
    arr.push(s)
    byName.set(s.name, arr)
  }
  const result: DotGroup[] = []
  for (const [name, list] of byName) {
    const visited = new Set<number>()
    for (let i = 0; i < list.length; i++) {
      if (visited.has(i)) continue
      const cluster: Station[] = [list[i]]
      visited.add(i)
      for (let j = i + 1; j < list.length; j++) {
        if (visited.has(j)) continue
        const dx = list[i].x - list[j].x
        const dy = list[i].y - list[j].y
        if (dx * dx + dy * dy < TRANSFER_DIST * TRANSFER_DIST) {
          cluster.push(list[j])
          visited.add(j)
        }
      }
      const linesInCluster = Array.from(new Set(cluster.map(s => s.line)))
      const cx = cluster.reduce((a, s) => a + s.x, 0) / cluster.length
      const cy = cluster.reduce((a, s) => a + s.y, 0) / cluster.length
      let dotX = cx
      let dotY = cy
      if (linesInCluster.length >= 2) {
        const segsByLine = linesInCluster.map(ln =>
          cluster.filter(s => s.line === ln).flatMap(s => [
            ...parseSegments(s.pathUp),
            ...parseSegments(s.pathDown),
          ])
        )
        let best = Infinity
        for (let a = 0; a < segsByLine.length; a++) {
          for (let b = a + 1; b < segsByLine.length; b++) {
            for (const sa of segsByLine[a]) {
              for (const sb of segsByLine[b]) {
                const p = intersectSeg(sa, sb)
                if (!p) continue
                const dd = (p.x - cx) ** 2 + (p.y - cy) ** 2
                if (dd < best) {
                  best = dd
                  dotX = p.x
                  dotY = p.y
                }
              }
            }
          }
        }
      } else if (cluster.length === 1) {
        dotX = cluster[0].x
        dotY = cluster[0].y
      }
      const ovr = DOT_POS_OVERRIDE[name]
      result.push({
        key: `${name}-${i}`,
        x: ovr?.x ?? dotX,
        y: ovr?.y ?? dotY,
        name,
        lines: linesInCluster,
        stations: cluster,
      })
    }
  }
  return result
})()

const terminals = activeStations.filter(s => {
  if (!s.pathUp || !s.pathDown) {
    if (s.line === '2호선' && s.name !== '까치산') return false
    return true
  }
  return false
})

type Side = 'top' | 'bottom' | 'left' | 'right'

const BADGE_SIDE: Record<string, Side> = {
  '인천': 'bottom',
  '광명': 'left',
  '서동탄': 'top',
  '신창(순천향대)': 'right',
  '까치산': 'top',
  '대화': 'top',
  '오금': 'right',
  '진접': 'bottom',
  '오이도': 'top',
}

function badgePos(s: Station): { x: number; y: number } {
  const side = BADGE_SIDE[s.name]
  if (side === 'top') return { x: s.x, y: s.y - BADGE_OFFSET - 8 }
  if (side === 'bottom') return { x: s.x, y: s.y + BADGE_OFFSET }
  if (side === 'left') return { x: s.x - BADGE_OFFSET, y: s.y }
  if (side === 'right') return { x: s.x + BADGE_OFFSET + 8, y: s.y }
  const tan = computeTangent(s.pathUp) ?? computeTangent(s.pathDown) ?? { dx: -1, dy: 0 }
  const len = Math.hypot(tan.dx, tan.dy) || 1
  const ux = -tan.dx / len
  const uy = -tan.dy / len
  return {
    x: s.x + ux * BADGE_OFFSET,
    y: s.y + uy * BADGE_OFFSET,
  }
}

type LabelDir = 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br'

const LABEL_DIR: Record<string, LabelDir> = {
  '개봉': 'bottom',
  '구일': 'bottom',
  '구로': 'br',
  '가산디지털단지': 'left',
  '석수': 'tr',
  '신도림': 'br',
  '구로디지털단지': 'tr',
  '을지로입구': 'bottom',
  '을지로4가': 'bottom',
  '동대문역사문화공원': 'tr',
  '을지로3가': 'tr',
  '한양대': 'left',
  '뚝섬': 'left',
  '서울대입구(관악구청)': 'bottom',
  '서초': 'bottom',
  '용두(동대문구청)': 'bottom',
  '회기': 'bottom',
  '외대앞': 'bottom',
  '양주': 'tr',
  '덕계': 'tr',
  '시청': 'tr',
  '도림천': 'top',
  '경복궁(정부서울청사)': 'left',
  '종로5가': 'bottom',
  '종로3가': 'tr',
  '충무로': 'bottom',
  '약수': 'right',
  '학여울': 'right',
  '교대(법원.검찰청)': 'tr',
  '정왕': 'left',
  '대야미': 'tl',
  '금정': 'tr',
  '사당': 'tl',
  '신용산': 'right',
  '삼각지': 'bottom',
  '회현(남대문시장)': 'br',
  '오류동': 'left',
  '별내별가람': 'bl',
}

function layoutForDir(x: number, y: number, dir: LabelDir): LabelLayout {
  const D = LABEL_DIST
  const Dd = D / Math.SQRT2
  switch (dir) {
    case 'top': return { x, y: y - D, textAnchor: 'middle', baseline: 'alphabetic' }
    case 'bottom': return { x, y: y + D, textAnchor: 'middle', baseline: 'hanging' }
    case 'left': return { x: x - D, y, textAnchor: 'end', baseline: 'central' }
    case 'right': return { x: x + D, y, textAnchor: 'start', baseline: 'central' }
    case 'tl': return { x: x - Dd, y: y - Dd, textAnchor: 'end', baseline: 'alphabetic', rotation: 20 }
    case 'tr': return { x: x + Dd - 1.5, y: y - Dd - 1.5, textAnchor: 'start', baseline: 'alphabetic', rotation: -20 }
    case 'bl': return { x: x - Dd, y: y + Dd, textAnchor: 'end', baseline: 'hanging', rotation: -20 }
    case 'br': return { x: x + Dd, y: y + Dd, textAnchor: 'start', baseline: 'hanging', rotation: 20 }
  }
}

const LABEL_OFFSET: Record<string, { dx?: number; dy?: number }> = {
  '을지로3가': { dx: 5, dy: -8 },
  '동대문역사문화공원': { dx: 4, dy: 10 },
  '종로3가': { dx: -3 },
  '금정': { dx: 3 },
  '사당': { dx: -1, dy: 4 },
  '시청': { dx: 2, dy: 7 },
}

function labelLayout(s: Station): LabelLayout {
  const dir = LABEL_DIR[s.name]
  if (dir) {
    const base = layoutForDir(s.x, s.y, dir)
    const ovr = LABEL_OFFSET[s.name]
    if (ovr) return { ...base, x: base.x + (ovr.dx ?? 0), y: base.y + (ovr.dy ?? 0) }
    return base
  }
  const tan = computeTangent(s.pathUp) ?? computeTangent(s.pathDown) ?? { dx: 1, dy: 0 }
  const isVertical = Math.abs(tan.dy) > Math.abs(tan.dx)
  if (isVertical) {
    return {
      x: s.x + LABEL_DIST,
      y: s.y,
      textAnchor: 'start',
      baseline: 'central',
    }
  }
  return {
    x: s.x,
    y: s.y - LABEL_DIST,
    textAnchor: 'middle',
    baseline: 'alphabetic',
  }
}

function InvertedWheelZoom({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const { zoomIn, zoomOut } = useControls()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY > 0) zoomIn(0.15, 150)
      else zoomOut(0.15, 150)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [zoomIn, zoomOut])
  return <div ref={ref} className="w-full h-full cursor-grab active:cursor-grabbing">{children}</div>
}

function Minimap() {
  const [tf, setTf] = useState({ x: 0, y: 0, scale: 1 })
  const [size, setSize] = useState({ w: 0, h: 0 })

  useTransformEffect(({ state }) => {
    setTf({ x: state.positionX, y: state.positionY, scale: state.scale })
  })

  useEffect(() => {
    const el = document.querySelector('.react-transform-wrapper') as HTMLElement | null
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [])

  if (size.w === 0 || size.h === 0) return null

  const MW = 180
  const MH = Math.round(MW * size.h / size.w)
  const m = MW / size.w

  const scopeLeft = -tf.x * m / tf.scale
  const scopeTop = -tf.y * m / tf.scale
  const scopeW = MW / tf.scale
  const scopeH = MH / tf.scale

  const visible = tf.scale > 1.01

  return (
    <div
      className={`fixed bottom-4 right-4 bg-white/95 border border-gray-300 rounded-md shadow-lg overflow-hidden pointer-events-none transition-all duration-200 ease-out ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'
      }`}
      style={{ width: MW, height: MH, transformOrigin: 'bottom right' }}
    >
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full block"
      >
        {activeLines.map(line => (
          <g key={line.name} stroke={line.color} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {(activeStationsByLine.get(line.name) ?? []).flatMap(s => {
              const paths = []
              if (s.pathUp) paths.push(<path key={`${s.id}-up`} d={s.pathUp} />)
              if (s.pathDown) paths.push(<path key={`${s.id}-down`} d={s.pathDown} />)
              return paths
            })}
          </g>
        ))}
      </svg>
      <div
        className="absolute border-2 border-red-500 bg-red-500/15"
        style={{ left: scopeLeft, top: scopeTop, width: scopeW, height: scopeH }}
      />
    </div>
  )
}

export default function SubwayMap() {
  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.5}
      maxScale={8}
      wheel={{ disabled: true }}
      doubleClick={{ disabled: true }}
    >
      <InvertedWheelZoom>
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <svg
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="block max-w-full max-h-full w-full h-full"
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
              {dotGroups.map(g => {
                const isTransfer = g.lines.length >= 2
                if (isTransfer) {
                  return (
                    <circle
                      key={`${g.key}-t`}
                      cx={g.x}
                      cy={g.y}
                      r={TRANSFER_R}
                      fill="white"
                      stroke="#111"
                      strokeWidth={TRANSFER_STROKE}
                    />
                  )
                }
                return (
                  <g key={g.key}>
                    <circle cx={g.x} cy={g.y} r={DOT_OUTER_R} fill="white" />
                    <circle cx={g.x} cy={g.y} r={DOT_INNER_R} fill={lineColorMap.get(g.lines[0]) ?? '#888'} />
                  </g>
                )
              })}
            </g>

            <g style={{ pointerEvents: 'none' }}>
              {dotGroups.map(g => {
                const l = labelLayout(g.stations[0])
                const isTransfer = g.lines.length >= 2
                return (
                  <text
                    key={`${g.key}-label`}
                    x={l.x}
                    y={l.y}
                    textAnchor={l.textAnchor}
                    dominantBaseline={l.baseline}
                    fontSize={isTransfer ? LABEL_FONT + 1.6 : LABEL_FONT}
                    fill="#111"
                    fontWeight={isTransfer ? 800 : 500}
                    paintOrder="stroke"
                    stroke="white"
                    strokeWidth={1.4}
                    strokeLinejoin="round"
                    transform={l.rotation ? `rotate(${l.rotation} ${l.x} ${l.y})` : undefined}
                  >
                    {g.name}
                  </text>
                )
              })}
            </g>

            <g style={{ pointerEvents: 'none' }}>
              {terminals.map(s => {
                const line = activeLines.find(l => l.name === s.line)
                if (!line) return null
                const pos = badgePos(s)
                const fontSize = line.label.length === 1 ? 10 : line.label.length === 2 ? 6 : 5
                return (
                  <g key={`${s.id}-badge`}>
                    <circle cx={pos.x} cy={pos.y} r={BADGE_R} fill={line.color} />
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
        </TransformComponent>
      </InvertedWheelZoom>
      <Minimap />
    </TransformWrapper>
  )
}
