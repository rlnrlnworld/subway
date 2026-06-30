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

const ACTIVE_LINES = ['1호선', '2호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선', '9호선', '인천1호선', '인천2호선', '신분당선', '수인분당', '경의중앙', '공항철도', '경춘', '경강', '서해', '용인경전철', '김포골드라인', '신림선', '우이신설', '의정부경전철', 'GTX-A']

const { lines: allLines } = linesData as { viewBox: { x: number; y: number; width: number; height: number }; lines: Line[] }
const allStations = stations as Station[]

const STATION_OVERRIDE: Record<string, Partial<Station>> = {
  '서해:김포공항역:15': { name: '김포공항' },
  '경의중앙:서울역:22': {
    name: '서울역(경의중앙)',
    x: 630,
    y: 377,
    pathUp: 'M 470 310 V 315 H 495 M 495 315 H 525 M 525 315 H 535 Q 540 315 545 320 L 600 372 Q 610 377 615 377 H 630',
    pathDown: null,
  },
  '경의중앙:가좌:23': {
    pathUp: 'M 525 315 H 535 Q 540 315 545 320 L 600 372 Q 610 377 615 377 H 630 M 495 315 H 525',
  },
  '경의중앙:디지털미디어시티:22': {
    pathDown: 'M 470 310 V 315 H 495 M 495 315 H 525 M 525 315 H 535 Q 540 315 545 320 L 600 372 Q 610 377 615 377 H 630',
  },
  '5호선:애오개:21': {
    y: 360,
    pathUp: 'M 605 460 V 360',
    pathDown: 'M 605 360 V 345',
  },
  '5호선:공덕:20': {
    pathDown: 'M 605 460 V 360',
  },
  '5호선:충정로(경기대입구):22': {
    pathUp: 'M 605 360 V 345',
  },
  '서해:부천종합운동장역:13': {
    name: '부천종합운동장',
    pathDown: 'M 205 475 H 285 Q 310 475 310 510 V 535 Q 310 540 305 540 H 290',
    pathUp: 'M 290 540 Q 260 540 260 555 V 565 V 640 Q 260 645 265 645 H 280 L 285 650',
  },
  '서해:원종:14': {
    pathUp: 'M 205 475 H 285 Q 310 475 310 510 V 535 Q 310 540 305 540 H 290',
  },
  '서해:소사:12': {
    pathDown: 'M 290 540 Q 260 540 260 555 V 565 V 640 Q 260 645 265 645 H 280 L 285 650',
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
const BADGE_R = 7
const BADGE_CORNER = 2.6
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

const SAME_LINE_PILL = new Set<string>([])

const TRANSFER_PILL_DOT_R = 2.4
const TRANSFER_PILL_GAP = 1.6
const TRANSFER_PILL_PAD = 1.6
const TRANSFER_PILL_STROKE = 0.8

type PillOrientation = 'horizontal' | 'vertical' | 'diag-up' | 'diag-down'

const TRANSFER_PILL_ORIENTATION: Record<string, PillOrientation> = {
  '일산': 'horizontal',
  '풍산': 'horizontal',
  '백마': 'horizontal',
  '곡산': 'horizontal',
  '대곡': 'horizontal',
  '연신내': 'horizontal',
  '디지털미디어시티': 'vertical',
  '상봉': 'vertical',
  '중랑': 'vertical',
  '회기': 'vertical',
  '망우': 'vertical',
  '수서': 'vertical',
  '성남': 'horizontal',
  '미금(분당서울대병원)': 'vertical',
  '한대앞': 'vertical',
  '중앙': 'vertical',
  '고잔': 'vertical',
  '초지': 'vertical',
  '오이도': 'vertical',
  '정왕': 'vertical',
  '신길온천': 'vertical',
  '안산': 'vertical',
  '원인재': 'horizontal',
  '김포공항': 'vertical',
  '을지로4가': 'vertical',
  '동대문역사문화공원': 'vertical',
  '왕십리': 'vertical',
}

const DOT_POS_OVERRIDE: Record<string, { x?: number; y?: number }> = {
  '김포공항': { y: 340 },
  '부천종합운동장': { x: 290, y: 540 },
  '충정로(경기대입구)': { y: 344 },
  '을지로4가': { x: 790, y: 340 },
  '동대문역사문화공원': { y: 345 },
  '왕십리': { x: 993, y: 395 },
  '일산': { x: 262 },
  '풍산': { x: 262 },
  '백마': { x: 262 },
  '곡산': { x: 262 },
  '대곡': { x: 258 },
  '구파발': { x: 415 },
  '디지털미디어시티': { y: 318 },
  '종로3가': { x: 720 },
  '성신여대입구': { y: 166 },
  '보문': { x: 900, y: 236 },
  '청량리': { y: 282 },
  '회기': { y: 281 },
  '중랑': { y: 283 },
  '망우': { y: 283 },
  '신내': { y: 258 },
  '별내': { y: 220 },
  '수서': { y: 762 },
  '미금(분당서울대병원)': { x: 1067 },
  '정자': { x: 1087 },
  '오이도': { y: 946 },
  '정왕': { y: 946 },
  '신길온천': { y: 946 },
  '안산': { y: 946 },
  '초지': { y: 946 },
  '고잔': { y: 946 },
  '중앙': { y: 946 },
  '한대앞': { y: 946 },
  '소사': { x: 281, y: 648 },
  '온수': { y: 604 },
  '보라매': { x: 524 },
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

const terminals = activeStations.filter(s => {
  if (!s.pathUp || !s.pathDown) {
    if (s.line === '2호선' && s.name !== '까치산') return false
    if (s.line === '6호선' && s.name !== '신내') return false
    if (s.line === '수인분당' && s.name === '수원') return false
    if (s.id === '경의중앙:문산:1') return false
    if (s.id === '우이신설:신설동:13') return false
    if (s.name === '청량리') return false
    if (s.name === '청량리(서울시립대입구)') return false
    if (s.id === '경춘:회기:2') return false
    if (s.id === '경춘:광운대:1') return false
    if (s.id === 'GTX-A:수서:4') return false
    if (s.id === '신분당선:강남:1') return false
    if (s.id === '경강:판교(판교테크노밸리):1') return false
    if (s.id === '용인경전철:기흥(백남준아트센터):1') return false
    if (s.id === '수인분당:인천:63') return false
    if (s.id === '1호선:금천구청:46') return false
    if (s.id === '1호선:금천구청:45') return false
    if (s.id === '김포골드라인:김포공항:10') return false
    if (s.id === '신림선:샛강:1') return false
    if (s.id === '공항철도:서울역:1') return false
    if (s.id === 'GTX-A:서울역:5') return false
    if (s.id === '경의중앙:서울역:22') return false
    if (s.id === '신분당선:신사:16') return false
    return true
  }
  return false
})

type Side = 'top' | 'bottom' | 'left' | 'right'

const BADGE_SIDE: Record<string, Side> = {
  '일산': 'left',
  '장암': 'right',
  '별내': 'right',
  '춘천(한림대)': 'bottom',
  '지평': 'left',
  '하남검단산': 'bottom',
  '오금': 'right',
  '마천': 'bottom',
  '모란': 'left',
  '광교(경기대)': 'left',
  '동탄': 'left',
  '전대.에버랜드': 'right',
  '신창(순천향대)': 'right',
  '오이도': 'left',
  '원시': 'left',
  '운연': 'bottom',
  '광명': 'left',
  '관악산(서울대)': 'right',
  '계양': 'top',
  '양촌': 'bottom',
  '신내': 'top',
  '발곡': 'top',
  '탑석': 'left',
}

const BADGE_EXTRA: Record<string, number> = {}

const BADGE_NUDGE: Record<string, { dx?: number; dy?: number }> = {
  '일산': { dx: -4, dy: 6 },
  '장암': { dx: -6 },
  '신내': { dx: -4, dy: -4 },
  '오금': { dx: 6 },
  '모란': { dx: 0, dy: 14 },
  '계양': { dx: -4 },
}

const BADGE_NUDGE_BY_ID: Record<string, { dx?: number; dy?: number }> = {}

function badgePos(s: Station): { x: number; y: number } {
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
    pos = {
      x: s.x + ux * BADGE_OFFSET,
      y: s.y + uy * BADGE_OFFSET,
    }
  }
  if (nudge) pos = { x: pos.x + (nudge.dx ?? 0), y: pos.y + (nudge.dy ?? 0) }
  if (nudgeById) pos = { x: pos.x + (nudgeById.dx ?? 0), y: pos.y + (nudgeById.dy ?? 0) }
  return pos
}

type LabelDir = 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br'

const LABEL_DIR: Record<string, LabelDir> = {
  '부평구청': 'right',
  '독정': 'right',
  '삼산체육관': 'left',
  '굴포천': 'left',
  '까치울': 'right',
  '신정네거리': 'right',
  '우장산': 'top',
  '문래': 'right',
  '영등포시장': 'right',
  '영등포구청': 'right',
  '신목동': 'right',
  '선유도': 'left',
  '국회의사당': 'right',
  '샛강': 'right',
  '마포': 'bottom',
  '영등포': 'right',
  '신도림': 'right',
  '신길': 'right',
  '대방': 'right',
  '구로': 'right',
  '구일': 'top',
  '개봉': 'bottom',
  '효창공원앞': 'top',
  '상수': 'right',
  '광흥창(서강)': 'bottom',
  '대흥(서강대앞)': 'bottom',
  '공덕': 'left',
  '을지로입구': 'bottom',
  '광화문(세종문화회관)': 'top',
  '동대문역사문화공원': 'top',
  '상왕십리': 'right',
  '한양대': 'right',
  '뚝섬': 'right',
  '성수': 'right',
  '용답': 'right',
  '왕십리': 'right',
  '마장': 'bottom',
  '서울숲': 'right',
  '압구정로데오': 'right',
  '강남구청': 'right',
  '청담': 'right',
  '구의(광진구청)': 'right',
  '강변(동서울터미널)': 'right',
  '잠실나루': 'right',
  '신내': 'right',
  '범골': 'bottom',
  '송산': 'right',
  '노들': 'right',
  '동대입구': 'right',
  '숙대입구(갈월)': 'right',
  '약수': 'right',
  '금호': 'right',
  '옥수': 'right',
  '신사': 'left',
  '남부터미널(예술의전당)': 'left',
  '용두(동대문구청)': 'left',
  '신답': 'left',
  '선정릉': 'bottom',
  '신설동': 'bottom',
  '검바위': 'left',
  '아시아드경기장': 'left',
  '서구청': 'left',
  '가정': 'left',
  '가정중앙시장': 'left',
  '공항화물청사': 'left',
  '인천공항1터미널': 'left',
  '인천공항2터미널': 'left',
  '김포공항': 'bottom',
  '탄현': 'top',
  '대곡': 'bottom',
  '능곡': 'right',
  '행신': 'right',
  '강매': 'right',
  '한국항공대': 'right',
  '수색': 'right',
  '연신내': 'top',
  '구산': 'right',
  '역촌': 'right',
  '응암': 'right',
  '새절(신사)': 'left',
  '증산(명지대앞)': 'left',
  '디지털미디어시티': 'top',
  '월드컵경기장(성산)': 'left',
  '마포구청': 'left',
  '망원': 'right',
  '독립문': 'right',
  '경복궁(정부서울청사)': 'right',
  '안국': 'right',
  '종각': 'left',
  '혜화': 'left',
  '한성대입구(삼선교)': 'left',
  '솔밭공원': 'right',
  '성신여대입구': 'left',
  '동묘앞': 'left',
  '안암(고대병원앞)': 'top',
  '보문': 'left',
  '창신': 'left',
  '외대앞': 'right',
  '수락산': 'right',
  '마들': 'right',
  '불암산': 'right',
  '진접': 'left',
  '태릉입구': 'left',
  '도봉산': 'left',
  '봉화산(서울의료원)': 'left',
  '갈매': 'left',
  '금곡': 'left',
  '퇴계원': 'right',
  '사릉': 'right',
  '팔당': 'right',
  '국수': 'top',
  '아차산(어린이대공원후문)': 'right',
  '광나루(장신대)': 'right',
  '강동': 'right',
  '둔촌오륜': 'bottom',
  '중앙보훈병원': 'right',
  '잠실(송파구청)': 'right',
  '석촌': 'right',
  '송파': 'right',
  '가락시장': 'right',
  '문정': 'right',
  '장지': 'right',
  '복정': 'right',
  '남위례': 'right',
  '산성': 'right',
  '경찰병원': 'right',
  '송파나루': 'right',
  '한성백제': 'right',
  '강동구청': 'right',
  '몽촌토성(평화의문)': 'right',
  '석촌고분': 'bottom',
  '삼전': 'bottom',
  '봉은사': 'right',
  '서현': 'bottom',
  '수내(한국잡월드)': 'bottom',
  '성남': 'left',
  '수서': 'top',
  '가천대': 'right',
  '잠실새내': 'top',
  '미금(분당서울대병원)': 'right',
  '정자': 'right',
  '동탄': 'top',
  '구성': 'left',
  '강남대': 'left',
  '지석': 'top',
  '세마': 'bottom',
  '병점': 'bottom',
  '세류': 'bottom',
  '고색': 'bottom',
  '오목천': 'bottom',
  '군포': 'right',
  '당정': 'right',
  '금정': 'right',
  '인덕원': 'right',
  '평촌': 'right',
  '범계': 'right',
  '산본': 'right',
  '수리산': 'right',
  '대야미': 'right',
  '한대앞': 'top',
  '시흥능곡': 'right',
  '시흥시청': 'right',
  '인천시청': 'left',
  '도화': 'right',
  '간석': 'right',
  '동암': 'right',
  '역곡': 'right',
  '소사': 'right',
  '온수': 'top',
  '천왕': 'right',
  '광명사거리': 'right',
  '독산': 'right',
  '금천구청': 'bottom',
  '소새울': 'right',
  '시흥대야': 'right',
  '신천': 'right',
  '모래내시장': 'right',
  '만수': 'right',
  '남동구청': 'right',
  '인천대공원': 'right',
  '관악': 'left',
  '안양': 'left',
  '명학': 'left',
  '대공원': 'right',
  '경마공원': 'right',
  '신대방': 'bottom',
  '당곡': 'left',
  '보라매병원': 'left',
  '구로디지털단지': 'right',
  '가산디지털단지': 'left',
  '부개': 'bottom',
  '송내': 'bottom',
  '중동': 'bottom',
  '부천': 'bottom',
  '원시': 'bottom',
  '시우': 'bottom',
  '원인재': 'bottom',
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

const LABEL_WRAP: Record<string, string[]> = {
  '가산디지털단지': ['가산', '디지털단지'],
  '동대문역사문화공원': ['동대문', '역사문화공원'],
}

const LABEL_OFFSET: Record<string, { dx?: number; dy?: number }> = {
  '김포공항': { dx: 14, dy: 14 },
  '공항시장': { dx: 4 },
  '부천종합운동장': { dy: 8 },
  '당산': { dx: -2, dy: -8 },
  '여의도': { dx: 4 },
  '샛강': { dx: 2 },
  '신길': { dx: 2 },
  '대방': { dx: 2 },
  '합정': { dx: 4 },
  '구일': { dx: -4 },
  '대림(구로구청)': { dx: 10 },
  '총신대입구(이수)': { dx: 18 },
  '효창공원앞': { dy: -4 },
  '공덕': { dy: 2 },
  '충정로(경기대입구)': { dy: -6 },
  '시청': { dx: 10 },
  '을지로3가': { dx: 16 },
  '종로3가': { dx: 6 },
  '동대문역사문화공원': { dx: -5, dy: -14 },
  '을지로4가': { dx: 8, dy: -3 },
  '신당': { dx: 10 },
  '청구': { dy: 8 },
  '왕십리': { dy: -8 },
  '강남구청': { dx: 4 },
  '건대입구': { dy: -6 },
  '일산': { dx: 4 },
  '풍산': { dx: 4 },
  '백마': { dx: 4 },
  '곡산': { dx: 4 },
  '대곡': { dx: -8 },
  '디지털미디어시티': { dy: -8 },
  '동대문': { dx: -12 },
  '동묘앞': { dx: 1, dy: 8 },
  '청량리': { dy: -9 },
  '회기': { dy: -6 },
  '중랑': { dy: -4 },
  '상봉': { dx: 12 },
  '태릉입구': { dy: 8 },
  '석계': { dy: 8 },
  '광운대': { dy: -4 },
  '창동': { dx: -1, dy: -8 },
  '도봉산': { dx: -2 },
  '노원': { dx: 6 },
  '망우': { dx: -2, dy: -4 },
  '신내': { dx: 2 },
  '회룡': { dx: 10 },
  '노량진': { dy: -8 },
  '서울역': { dx: 14 },
  '충무로': { dx: 6 },
  '약수': { dx: 4 },
  '삼각지': { dx: -12 },
  '이촌': { dx: -9 },
  '용산': { dx: -1, dy: 6 },
  '동작(현충원)': { dy: -8 },
  '고속터미널': { dy: 8 },
  '교대(법원.검찰청)': { dx: -10 },
  '논현': { dx: 2, dy: -7 },
  '신논현': { dx: 12 },
  '선정릉': { dx: 6 },
  '신설동': { dx: -6 },
  '별내': { dy: -4 },
  '구리': { dy: -8 },
  '군자(능동)': { dx: 10 },
  '천호(풍납토성)': { dx: 10 },
  '올림픽공원(한국체대)': { dx: -1, dy: -8 },
  '석촌': { dx: 4 },
  '가락시장': { dx: 4 },
  '복정': { dx: 4 },
  '수서': { dy: -8 },
  '이매': { dx: 10 },
  '성남': { dx: 2, dy: -8 },
  '종합운동장': { dx: 18 },
  '선릉': { dx: -4 },
  '강남': { dy: 8 },
  '도곡': { dy: 8 },
  '양재(서초구청)': { dy: 8 },
  '미금(분당서울대병원)': { dx: 2, dy: 1 },
  '정자': { dx: 4 },
  '구성': { dy: 8 },
  '기흥(백남준아트센터)': { dy: 8 },
  '수원': { dx: -2, dy: -8 },
  '금정': { dx: 2 },
  '오이도': { dx: 14, dy: -2 },
  '정왕': { dy: -4 },
  '신길온천': { dy: -4 },
  '안산': { dy: -4 },
  '초지': { dy: -4 },
  '고잔': { dy: -4 },
  '중앙': { dy: -4 },
  '한대앞': { dy: -4 },
  '원인재': { dx: -14 },
  '연수': { dy: -2 },
  '송도': { dy: -2 },
  '인하대': { dy: -2 },
  '숭의(인하대병원)': { dy: -2 },
  '인천시청': { dy: 8 },
  '주안': { dy: 8 },
  '석남': { dx: 9 },
  '부평': { dx: -1, dy: 7 },
  '소사': { dx: 2 },
  '온수': { dy: -4 },
  '사당': { dy: 8 },
  '신림': { dx: 4 },
  '보라매': { dx: -12 },
  '가산디지털단지': { dx: 1, dy: 10 },
}

function labelLayout(s: Station, x?: number, y?: number): LabelLayout {
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

function InvertedWheelZoom({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const { zoomIn, zoomOut } = useControls()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const isPinch = e.ctrlKey
      if (isPinch) {
        if (e.deltaY < 0) zoomIn(0.15, 150)
        else zoomOut(0.15, 150)
      } else {
        if (e.deltaY > 0) zoomIn(0.15, 150)
        else zoomOut(0.15, 150)
      }
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
      initialScale={1.6}
      minScale={0.5}
      maxScale={8}
      centerOnInit
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
              {dotGroups.filter(g => g.lines.length < 2).map(g => (
                <g key={g.key}>
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
                    transform={rotate ? `rotate(${rotate} ${g.x} ${g.y})` : undefined}
                  >
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
        </TransformComponent>
      </InvertedWheelZoom>
      <Minimap />
    </TransformWrapper>
  )
}
