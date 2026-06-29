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
  '2호선:까치산:5': {
    y: 467.1,
    pathUp: 'M 353.3 497.8 h -2.4 c -11 0 -20 -9 -20 -20 v -10.8',
  },
  '5호선:김포공항:3': {
    y: 254.4,
    pathDown: 'M 271.9 254.4 v 63.5',
  },
  '5호선:송정:4': {
    pathUp: 'M 271.9 254.4 v 63.5',
  },
  '5호선:영등포구청:14': {
    pathDown: 'M 451.9 467.1 C 470.1 467.1 482.3 471.4 482.3 481.4',
  },
  '5호선:영등포시장:15': {
    pathUp: 'M 451.9 467.1 C 470.1 467.1 482.3 471.4 482.3 481.4',
    pathDown: 'M 482.3 481.4 C 482.3 491.2 490.8 505.9 516.1 505.9',
  },
  '5호선:신길:16': {
    y: 505.9,
    pathUp: 'M 482.3 481.4 C 482.3 491.2 490.8 505.9 516.1 505.9',
    pathDown: 'M 516.1 505.9 C 533.2 505.9 538.9 484.9 538.9 470.9',
  },
  '5호선:여의도:17': {
    pathUp: 'M 516.1 505.9 C 533.2 505.9 538.9 484.9 538.9 470.9',
  },
  '5호선:광화문(세종문화회관):24': {
    pathDown: 'M 592.4 216 c 14 0 26 11 26 20 v 26.8',
  },
  '5호선:종로3가(탑골공원):25': {
    name: '종로3가',
    x: 618.4,
    pathUp: 'M 592.4 216 c 14 0 26 11 26 20 v 26.8',
    pathDown: 'M 618.4 262.9 V 288.1 c 0 11 9 20 20 20 l 2.5 0',
  },
  '5호선:을지로4가:26': {
    pathUp: 'M 618.4 262.9 V 288.1 c 0 11 9 20 20 20 l 2.5 0',
    pathDown: 'M 640.9 308.1 h 19',
  },
  '5호선:동대문역사문화공원:27': {
    pathUp: 'M 640.9 308.1 h 19',
    pathDown: 'M 659.9 308.1 c 22.5 0 22.5 20 45 20',
  },
  '5호선:청구:28': {
    pathUp: 'M 659.9 308.1 c 22.5 0 22.5 20 45 20',
  },
  '5호선:신금호:29': {
    pathDown: 'M 732.3 328.1 h 24.1',
  },
  '5호선:행당:30': {
    y: 328.1,
    pathUp: 'M 732.3 328.1 h 24.1',
    pathDown: 'M 756.4 328.1 c 15.3 0 15.3 -14.7 30.6 -14.7',
  },
  '5호선:미사:46': {
    x: 1054.8,
    y: 419.1,
    pathDown: 'M 1054.8 419.1 h 26.9',
  },
  '5호선:하남풍산:47': {
    x: 1081.7,
    y: 419.1,
    pathDown: 'M 1081.7 419.1 h 27.1',
  },
  '5호선:하남시청(덕풍.신장):48': {
    x: 1108.8,
    y: 419.1,
    pathDown: 'M 1108.8 419.1 c 11 0 20 9 20 20',
  },
  '5호선:하남검단산역:49': {
    x: 1128.8,
    y: 439.1,
    pathDown: null,
  },
  '6호선:응암:1': { x: 409.4, y: 200 },
  '6호선:역촌:2': { x: 446, y: 181.6 },
  '6호선:불광:3': { x: 451.9, y: 164.9 },
  '6호선:독바위:4': { x: 429.4, y: 132.7 },
  '6호선:연신내:5': { x: 409.4, y: 164.9 },
  '6호선:구산:6': { x: 409.4, y: 181.6 },
  '3호선:동대입구:24': {
    pathDown: 'M 677.9 337.2 c 11 0 27 9 27 20 v 8.9',
  },
  '3호선:약수:25': {
    x: 704.9,
    pathUp: 'M 677.9 337.2 c 11 0 27 9 27 20 v 8.9',
    pathDown: 'M 704.9 366.1 v 33.4',
  },
  '3호선:금호:26': {
    x: 704.9,
    pathUp: 'M 704.9 366.1 v 33.4',
    pathDown: 'M 704.9 399.5 v 33.9',
  },
  '3호선:옥수:27': {
    x: 704.9,
    pathUp: 'M 704.9 399.5 v 33.9',
    pathDown: 'M 704.9 433.4 v 22.2',
  },
  '3호선:압구정:28': {
    x: 704.9,
    pathUp: 'M 704.9 433.4 v 22.2',
    pathDown: 'M 704.9 455.6 v 18.7',
  },
  '3호선:신사:29': {
    x: 704.9,
    pathUp: 'M 704.9 455.6 v 18.7',
    pathDown: 'M 704.9 474.3 v 19.1',
  },
  '3호선:잠원:30': {
    x: 704.9,
    pathUp: 'M 704.9 474.3 v 19.1',
    pathDown: 'M 704.9 493.4 v 26.3',
  },
  '3호선:고속터미널:31': {
    x: 704.9,
    pathUp: 'M 704.9 493.4 v 26.3',
    pathDown: 'M 704.9 519.7 v 59.7',
  },
  '3호선:교대(법원.검찰청):32': {
    x: 704.9,
    pathUp: 'M 704.9 519.7 v 59.7',
    pathDown: 'M 704.9 579.4 v 33.3',
  },
  '3호선:남부터미널(예술의전당):33': {
    x: 704.9,
    pathUp: 'M 704.9 579.4 v 33.3',
    pathDown: 'M 704.9 612.7 c 0 11 9 20 20 20 h 4.9',
  },
  '3호선:양재(서초구청):34': {
    pathUp: 'M 704.9 612.7 c 0 11 9 20 20 20 h 4.9',
  },
  '7호선:온수(성공회대입구):42': {
    name: '온수',
  },
  '7호선:석남(거북시장):53': {
    name: '석남',
  },
  '1호선:청량리(서울시립대입구):25': {
    name: '청량리',
  },
  '4호선:이촌(국립중앙박물관):22': {
    name: '이촌',
  },
  '6호선:광흥창(서강):15': {
    name: '광흥창',
  },
  '6호선:대흥(서강대앞):16': {
    name: '대흥',
  },
  '경의중앙:가좌:23': {
    pathDown: 'M 438 261.4 c 11 0 20 9 20 20 v 74.2',
  },
  '경의중앙:홍대입구:24': {
    x: 458,
    pathUp: 'M 438 261.4 c 11 0 20 9 20 20 v 74.2',
    pathDown: 'M 458 355.6 v 13.3 c 0 8.3 6.7 15 15 15 h 23.2',
  },
  '경의중앙:서강대:25': {
    pathUp: 'M 458 355.6 v 13.3 c 0 8.3 6.7 15 15 15 h 23.2',
  },
  '수인분당:청량리:1': {
    pathDown: 'M 834.9 262.9 V 280 c 0 5 -5 4.2 -10 4.2 H 802 c -8.3 0 -15 6.7 -15 15 v 14.3',
  },
  '경의중앙:서울역:22': {
    pathDown: 'M 568.9 366.1 H 580.9',
  },
  '수인분당:선정릉(한국과학창의재단):6': {
    name: '선정릉',
  },
  '수인분당:복정(동서울대학):14': {
    name: '복정',
  },
  '신분당선:신사:16': {
    pathDown: 'M 708 474.3 h 13 c 8 0 16 2 22 6.1',
  },
  '신분당선:논현:15': {
    pathUp: 'M 708 474.3 h 13 c 8 0 16 2 22 6.1',
  },
  '5호선:왕십리:31': {
    x: 787,
    pathUp: 'M 756.4 328.1 c 15.3 0 15.3 -14.7 30.6 -14.7',
    pathDown: 'M 787 313.4 h 57.5',
  },
  '5호선:마장:32': {
    pathUp: 'M 787 313.4 h 57.5',
  },
  '2호선:상왕십리:7': {
    pathDown: 'M 742 308.1 h 37 c 4 0 8 1.9 8 5.2',
  },
  '2호선:왕십리:8': {
    x: 787,
    pathUp: 'M 742 308.1 h 37 c 4 0 8 1.9 8 5.2',
    pathDown: 'M 787 313.3 c 5 5 22 9 29.1 11.3',
  },
  '2호선:한양대:9': {
    pathUp: 'M 787 313.3 c 5 5 22 9 29.1 11.3',
  },
  '수인분당:서울숲:3': {
    pathDown: 'M 787 372 V 410',
  },
  '수인분당:압구정로데오:4': {
    y: 410,
    pathUp: 'M 787 372 V 410',
    pathDown: 'M 787 410 V 443.4',
  },
  '수인분당:강남구청:5': {
    pathUp: 'M 787 410 V 443.4',
  },
  '수인분당:영통(경희대):32': {
    pathDown: 'M 574 710.1 c -5 6 -19 13 -19 21.4',
  },
  '수인분당:망포:33': {
    x: 555,
    pathUp: 'M 574 710.1 c -5 6 -19 13 -19 21.4',
    pathDown: 'M 555 731.5 v 19.4',
  },
  '수인분당:매탄권선:34': {
    x: 555,
    pathUp: 'M 555 731.5 v 19.4',
    pathDown: 'M 555 750.9 v 19.6',
  },
  '수인분당:수원시청(경기도문화의전당):35': {
    x: 555,
    pathUp: 'M 555 750.9 v 19.6',
    pathDown: 'M 555 770.5 V 789.9',
  },
  '수인분당:매교:36': {
    x: 555,
    pathUp: 'M 555 770.5 V 789.9',
    pathDown: 'M 555 789.9 V 797.9',
  },
  '수인분당:수원:37': {
    x: 555,
    pathUp: 'M 555 789.9 V 797.9',
    pathDown: 'M 555 797.9 V 813',
  },
  '수인분당:고색:38': {
    y: 810,
    pathUp: 'M 555 797.9 V 813 c 0 5 -5 5 -10 5 h -31.1 c -7 0 -10 -3 -10 -8',
    pathDown: 'M 503.9 810 V 770',
  },
  '수인분당:오목천:39': {
    y: 770,
    pathUp: 'M 503.9 810 V 770',
    pathDown: 'M 503.9 770 V 737.6',
  },
  '수인분당:어천:40': {
    pathUp: 'M 503.9 770 V 737.6',
  },
  '2호선:잠실나루:15': {
    pathDown: 'M 828.9 479.8 v 30.2',
  },
  '2호선:잠실(송파구청):16': {
    y: 510,
    pathUp: 'M 828.9 479.8 v 30.2',
    pathDown: 'M 828.9 510 v 22.6',
  },
  '2호선:잠실새내:17': {
    pathUp: 'M 828.9 510 v 22.6',
  },
  '8호선:몽촌토성(평화의문):10': {
    pathDown: 'M 841.9 490.6 c -4 4 -13 12 -13 17 v 2.4',
  },
  '8호선:잠실(송파구청):11': {
    x: 828.9,
    y: 510,
    pathUp: 'M 841.9 490.6 c -4 4 -13 12 -13 17 v 2.4',
    pathDown: 'M 828.9 510 v 8 c 0 4 25 26.2 33.4 26.2 h 8',
  },
  '8호선:석촌:12': {
    pathUp: 'M 828.9 510 v 8 c 0 4 25 26.2 33.4 26.2 h 8',
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

const SAME_LINE_PILL = new Set<string>(['문산'])

const TRANSFER_PILL_DOT_R = 2.4
const TRANSFER_PILL_GAP = 1.6
const TRANSFER_PILL_PAD = 1.6
const TRANSFER_PILL_STROKE = 0.8

type PillOrientation = 'horizontal' | 'vertical' | 'diag-up' | 'diag-down'

const TRANSFER_PILL_ORIENTATION: Record<string, PillOrientation> = {
  '서울역': 'vertical',
  '주안': 'horizontal',
  '오이도': 'horizontal',
  '정왕': 'diag-up',
  '신길온천': 'vertical',
  '안산': 'vertical',
  '초지': 'diag-down',
  '고잔': 'horizontal',
  '중앙': 'horizontal',
  '미금(분당서울대병원)': 'vertical',
  '정자': 'vertical',
  '모란': 'vertical',
  '수서': 'vertical',
  '복정': 'horizontal',
  '공덕': 'vertical',
  '효창공원앞': 'vertical',
}

const DOT_POS_OVERRIDE: Record<string, { x?: number; y?: number }> = {
  '신설동': { y: 264 },
  '오금': { y: 584.95 },
  '효창공원앞': { x: 554 },
  '공덕': { y: 392 },
  '홍대입구': { y: 335 },
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
    return true
  }
  return false
})

type Side = 'top' | 'bottom' | 'left' | 'right'

const BADGE_SIDE: Record<string, Side> = {
  '인천': 'left',
  '광명': 'left',
  '서동탄': 'top',
  '신창(순천향대)': 'right',
  '까치산': 'top',
  '대화': 'top',
  '오금': 'right',
  '진접': 'bottom',
  '오이도': 'left',
  '방화': 'left',
  '마천': 'right',
  '하남검단산역': 'bottom',
  '신내': 'bottom',
  '장암': 'left',
  '석남': 'left',
  '별내': 'right',
  '모란': 'bottom',
  '개화': 'top',
  '중앙보훈병원': 'right',
  '계양': 'top',
  '송도달빛축제공원': 'bottom',
  '검단오류': 'top',
  '운연': 'left',
  '광교(경기대)': 'left',
  '신사': 'left',
  '청량리': 'right',
  '수원': 'bottom',
}

const BADGE_EXTRA: Record<string, number> = {
  '하남검단산역': 10,
  '별내': 6,
}

const BADGE_NUDGE: Record<string, { dx?: number; dy?: number }> = {
  '송도달빛축제공원': { dx: -10 },
  '청량리': { dx: -12 },
}

const BADGE_NUDGE_BY_ID: Record<string, { dx?: number; dy?: number }> = {
  '1호선:인천:62': { dy: -11 },
  '수인분당:인천:63': { dy: 11 },
}

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
  '한국항공대': 'left',
  '수색': 'left',
  '탄현': 'right',
  '상수': 'bottom',
  '광흥창': 'bottom',
  '대흥': 'bottom',
  '서강대': 'top',
  '가좌': 'bottom',
  '서빙고': 'right',
  '한남': 'left',
  '응봉': 'left',
  '홍대입구': 'bottom',
  '개봉': 'bottom',
  '구일': 'bottom',
  '구로': 'br',
  '가산디지털단지': 'bottom',
  '석수': 'tr',
  '신도림': 'br',
  '구로디지털단지': 'tr',
  '을지로입구': 'bottom',
  '을지로4가': 'bottom',
  '동대문역사문화공원': 'top',
  '을지로3가': 'top',
  '한양대': 'left',
  '뚝섬': 'left',
  '서울대입구(관악구청)': 'bottom',
  '서초': 'bottom',
  '용두(동대문구청)': 'bottom',
  '회기': 'bottom',
  '외대앞': 'bottom',
  '양주': 'tr',
  '덕계': 'tr',
  '시청': 'top',
  '도림천': 'top',
  '경복궁(정부서울청사)': 'left',
  '종로5가': 'bottom',
  '종로3가': 'tr',
  '충무로': 'bottom',
  '약수': 'right',
  '학여울': 'right',
  '교대(법원.검찰청)': 'top',
  '정왕': 'left',
  '대야미': 'tl',
  '금정': 'tr',
  '사당': 'tl',
  '신용산': 'right',
  '삼각지': 'bottom',
  '회현(남대문시장)': 'br',
  '오류동': 'left',
  '별내별가람': 'bl',
  '김포공항': 'top',
  '화곡': 'bottom',
  '오목교(목동운동장앞)': 'bottom',
  '영등포구청': 'tr',
  '영등포시장': 'right',
  '대방': 'bottom',
  '충정로(경기대입구)': 'top',
  '장한평': 'tr',
  '강동': 'bottom',
  '길동': 'left',
  '둔촌동': 'bottom',
  '올림픽공원(한국체대)': 'right',
  '하남검단산역': 'bottom',
  '개롱': 'bottom',
  '오금': 'bottom',
  '효창공원앞': 'bottom',
  '공덕': 'top',
  '마포': 'left',
  '한강진': 'bottom',
  '역촌': 'right',
  '불광': 'tr',
  '연신내': 'tr',
  '응암': 'right',
  '창신': 'top',
  '춘의': 'left',
  '삼산체육관': 'right',
  '부천종합운동장': 'bottom',
  '온수': 'top',
  '장승배기': 'bottom',
  '반포': 'right',
  '논현': 'right',
  '학동': 'right',
  '강남구청': 'right',
  '청담': 'right',
  '자양(뚝섬한강공원)': 'left',
  '건대입구': 'left',
  '어린이대공원(세종대)': 'bottom',
  '중곡': 'right',
  '용마산': 'right',
  '사가정': 'right',
  '면목': 'right',
  '태릉입구': 'bottom',
  '도봉': 'right',
  '마들': 'right',
  '장암': 'right',
  '잠실나루': 'left',
  '잠실새내': 'left',
  '몽촌토성(평화의문)': 'bottom',
  '석촌': 'top',
  '잠실(송파구청)': 'left',
  '천호(풍납토성)': 'bottom',
  '남위례': 'bottom',
  '남한산성입구(성남법원.검찰청)': 'right',
  '암사': 'bottom',
  '장자호수공원': 'right',
  '구리': 'bottom',
  '동구릉': 'bottom',
  '공항시장': 'bottom',
  '등촌': 'right',
  '노들': 'bottom',
  '흑석(중앙대입구)': 'bottom',
  '구반포': 'bottom',
  '신반포': 'top',
  '사평': 'bottom',
  '봉은사': 'right',
  '삼성중앙': 'right',
  '석촌고분': 'bottom',
  '송파': 'bottom',
  '검바위': 'left',
  '아시아드경기장': 'left',
  '귤현': 'right',
  '갈산': 'left',
  '서구청': 'left',
  '가정': 'left',
  '가정중앙시장': 'left',
  '서부여성회관': 'left',
  '인천가좌': 'left',
  '가재울': 'left',
  '주안국가산단': 'left',
  '석바위시장': 'bottom',
  '백운': 'tl',
  '동수': 'bl',
  '석천사거리': 'bottom',
  '인천시청': 'top',
  '만수': 'right',
  '국제업무지구': 'bottom',
  '인천대입구': 'bottom',
  '숭의(인하대병원)': 'left',
  '인하대': 'bottom',
  '송도': 'left',
  '연수': 'left',
  '신포': 'left',
  '남동인더스파크': 'bottom',
  '호구포': 'bottom',
  '인천논현': 'bottom',
  '소래포구': 'bottom',
  '오이도': 'right',
  '청명': 'bottom',
  '상갈(루터대학교)': 'bottom',
  '기흥(백남준아트센터)': 'bottom',
  '신갈': 'bottom',
  '구성': 'bottom',
  '보정': 'bottom',
  '죽전(단국대)': 'bottom',
  '오리': 'bottom',
  '미금(분당서울대병원)': 'bottom',
  '정자': 'bottom',
  '양재시민의숲(매헌)': 'bottom',
  '판교(판교테크노밸리)': 'right',
  '남부터미널(예술의전당)': 'left',
  '고속터미널': 'right',
  '압구정로데오': 'left',
  '신논현': 'bottom',
  '선정릉': 'bottom',
  '강남': 'top',
  '도곡': 'top',
  '구룡': 'bottom',
  '대모산입구': 'right',
  '수서': 'top',
  '청량리': 'top',
  '복정': 'left',
  '가천대': 'left',
  '태평': 'left',
  '신길온천': 'bottom',
  '안산': 'bottom',
  '중앙': 'right',
  '고잔': 'right',
  '한대앞': 'left',
  '상록수': 'left',
  '어천': 'left',
  '오목천': 'left',
  '고색': 'left',
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
  '대곡': { dx: -10 },
  '공덕': { dy: -6 },
  '디지털미디어시티': { dy: -10 },
  '홍대입구': { dx: 14, dy: 2 },
  '합정': { dy: -4 },
  '을지로3가': { dy: -9 },
  '시청': { dy: 2 },
  '종로3가': { dx: -3 },
  '금정': { dx: 3 },
  '사당': { dx: -1, dy: 4 },
  '을지로4가': { dy: 9 },
  '동대문역사문화공원': { dx: 2, dy: 4 },
  '약수': { dy: -8 },
  '온수': { dy: 4 },
  '가산디지털단지': { dy: -6 },
  '건대입구': { dx: -4 },
  '어린이대공원(세종대)': { dx: 10 },
  '장한평': { dy: 2 },
  '태릉입구': { dy: -4 },
  '몽촌토성(평화의문)': { dx: 6 },
  '교대(법원.검찰청)': { dx: 6, dy: -2 },
  '김포공항': { dy: 10 },
  '여의도': { dx: 2, dy: -8 },
  '샛강': { dx: 4, dy: 1 },
  '삼성중앙': { dy: -2 },
  '선정릉': { dy: 2 },
  '강남': { dy: -2 },
  '도곡': { dx: 10, dy: 2 },
  '논현': { dx: 2 },
  '수서': { dy: -8 },
  '모란': { dy: -4 },
  '복정': { dx: -2 },
  '석촌고분': { dx: 10, dy: -2 },
  '종합운동장': { dx: -6, dy: 10 },
  '올림픽공원(한국체대)': { dx: -3, dy: -8 },
  '부평구청': { dx: -6 },
  '삼산체육관': { dx: -1, dy: 3 },
  '백운': { dy: 3 },
  '동수': { dy: -2 },
  '인천시청': { dy: 6 },
  '오이도': { dx: 6 },
  '중앙': { dx: 6, dy: 1 },
  '한대앞': { dx: 6, dy: -6 },
  '미금(분당서울대병원)': { dy: 6 },
  '정자': { dy: 6 },
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
                    {g.name.replace(/\(.+?\)/g, '')}
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
