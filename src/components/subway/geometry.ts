import type { Pt, Seg, Station, LabelLayout, LabelDir } from './types'
import { BADGE_OFFSET, BADGE_R, LABEL_DIST } from './config'
import {
  BADGE_SIDE,
  BADGE_EXTRA,
  BADGE_NUDGE,
  BADGE_NUDGE_BY_ID,
  LABEL_DIR,
  LABEL_OFFSET,
} from './overrides'

// ─────────────────────────────────────────────────────────
// SVG path parsing
// ─────────────────────────────────────────────────────────
export function parseSegments(d: string | null): Seg[] {
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

export function computeTangent(d: string | null): { dx: number; dy: number } | null {
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

export function intersectSeg(s1: Seg, s2: Seg): Pt | null {
  const { a: p1, b: p2 } = s1
  const { a: p3, b: p4 } = s2
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)
  if (Math.abs(denom) < 1e-9) return null
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) }
}

// ─────────────────────────────────────────────────────────
// Terminal badge 위치
// ─────────────────────────────────────────────────────────
export function badgePos(s: Station): { x: number; y: number } {
  const side = BADGE_SIDE[s.name]
  const extra = BADGE_EXTRA[s.name] ?? 0
  const nudge = BADGE_NUDGE[s.name]
  const nudgeById = BADGE_NUDGE_BY_ID[s.id]
  let pos: { x: number; y: number }
  if (side === 'top') pos = { x: s.x, y: s.y - BADGE_OFFSET - 8 - extra }
  else if (side === 'bottom') pos = { x: s.x, y: s.y + BADGE_OFFSET + extra }
  else if (side === 'left') pos = { x: s.x - BADGE_OFFSET - extra, y: s.y }
  else if (side === 'right') pos = { x: s.x + BADGE_OFFSET + 8 + extra, y: s.y }
  else {
    const tan = computeTangent(s.pathUp) ?? computeTangent(s.pathDown) ?? { dx: -1, dy: 0 }
    const len = Math.hypot(tan.dx, tan.dy) || 1
    const ux = -tan.dx / len
    const uy = -tan.dy / len
    pos = { x: s.x + ux * BADGE_OFFSET, y: s.y + uy * BADGE_OFFSET }
  }
  if (nudge) pos = { x: pos.x + (nudge.dx ?? 0), y: pos.y + (nudge.dy ?? 0) }
  if (nudgeById) pos = { x: pos.x + (nudgeById.dx ?? 0), y: pos.y + (nudgeById.dy ?? 0) }
  return pos
}

// 접미 방어용 export (viewBox 계산 시 필요)
export { BADGE_OFFSET, BADGE_R }

// ─────────────────────────────────────────────────────────
// Label layout
// ─────────────────────────────────────────────────────────
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

export function labelLayout(s: Station, x?: number, y?: number): LabelLayout {
  const dir = LABEL_DIR[s.name]
  const ovr = LABEL_OFFSET[s.name]
  const px = x ?? s.x
  const py = y ?? s.y
  let base: LabelLayout
  if (dir) {
    base = layoutForDir(px, py, dir)
  } else {
    const tan = computeTangent(s.pathUp) ?? computeTangent(s.pathDown) ?? { dx: 1, dy: 0 }
    const isVertical = Math.abs(tan.dy) > Math.abs(tan.dx)
    base = isVertical
      ? { x: px + LABEL_DIST, y: py, textAnchor: 'start', baseline: 'central' }
      : { x: px, y: py - LABEL_DIST, textAnchor: 'middle', baseline: 'alphabetic' }
  }
  if (ovr) return { ...base, x: base.x + (ovr.dx ?? 0), y: base.y + (ovr.dy ?? 0) }
  return base
}
