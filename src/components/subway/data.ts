import stations from '@/data/stations.json'
import linesData from '@/data/lines.json'
import type { Station, Line, DotGroup } from './types'
import {
  ACTIVE_LINES,
  BADGE_OFFSET,
  BADGE_R,
  TRANSFER_DIST,
} from './config'
import {
  STATION_OVERRIDE,
  DOT_POS_OVERRIDE,
  SAME_LINE_PILL,
  TERMINAL_EXCLUDE_IDS,
  TERMINAL_EXCLUDE_NAMES,
  TERMINAL_ALLOW_LINE_NAME,
  TERMINAL_EXCLUDE_LINE_NAME,
} from './overrides'
import { parseSegments, intersectSeg } from './geometry'

const { lines: allLines } = linesData as {
  viewBox: { x: number; y: number; width: number; height: number }
  lines: Line[]
}
const allStations = stations as Station[]

// ─────────────────────────────────────────────────────────
// Active stations / lines (STATION_OVERRIDE 적용)
// ─────────────────────────────────────────────────────────
export const activeStations = allStations
  .filter(s => ACTIVE_LINES.includes(s.line))
  .map(s => {
    const ovr = STATION_OVERRIDE[s.id]
    return ovr ? { ...s, ...ovr } : s
  })

export const activeLines = allLines.filter(l => ACTIVE_LINES.includes(l.name))

export const lineColorMap = new Map(activeLines.map(l => [l.name, l.color]))

export const activeStationsByLine = new Map<string, Station[]>()
for (const s of activeStations) {
  const arr = activeStationsByLine.get(s.line) ?? []
  arr.push(s)
  activeStationsByLine.set(s.line, arr)
}

// ─────────────────────────────────────────────────────────
// viewBox 계산
// ─────────────────────────────────────────────────────────
export const viewBox = (() => {
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

// ─────────────────────────────────────────────────────────
// Dot groups (환승 cluster)
// ─────────────────────────────────────────────────────────
export const dotGroups: DotGroup[] = (() => {
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
      const linesInCluster = SAME_LINE_PILL.has(name)
        ? cluster.map(s => s.line)
        : Array.from(new Set(cluster.map(s => s.line)))
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

// dot 그룹 인덱스 (툴팁 클릭 O(1) 조회용)
export const dotGroupsByKey = new Map(dotGroups.map(g => [g.key, g]))

// ─────────────────────────────────────────────────────────
// Terminals (badge 표시 대상)
// ─────────────────────────────────────────────────────────
export const terminals = activeStations.filter(s => {
  if (s.pathUp && s.pathDown) return false
  // allow/exclude 예외
  if (TERMINAL_EXCLUDE_IDS.has(s.id)) return false
  if (TERMINAL_EXCLUDE_NAMES.has(s.name)) return false
  for (const ex of TERMINAL_EXCLUDE_LINE_NAME) {
    if (s.line === ex.line && s.name === ex.name) return false
  }
  // 특정 line은 특정 이름만 통과 (그 외 제외)
  const allowLines = TERMINAL_ALLOW_LINE_NAME.filter(a => a.line === s.line)
  if (allowLines.length > 0 && !allowLines.some(a => a.name === s.name)) return false
  return true
})
