import { NextRequest, NextResponse } from 'next/server'
import apiMap from '@/data/station-api-map.json'
import type { Arrival, ArrivalsResponse } from '@/types/arrivals'

// ─────────────────────────────────────────
// 정적 시간표 파일 import (build 시점 bundle)
// - 1~9호선: Seoul API 소스, key=stationCd (4-digit)
// - 나머지: TAGO 소스 (일부는 seoulmetro HTML 보충), key=tagoStationId
// ─────────────────────────────────────────
import tt_1 from '@/data/timetables/1호선.json'
import tt_2 from '@/data/timetables/2호선.json'
import tt_3 from '@/data/timetables/3호선.json'
import tt_4 from '@/data/timetables/4호선.json'
import tt_5 from '@/data/timetables/5호선.json'
import tt_6 from '@/data/timetables/6호선.json'
import tt_7 from '@/data/timetables/7호선.json'
import tt_8 from '@/data/timetables/8호선.json'
import tt_9 from '@/data/timetables/9호선.json'
import tt_gtxa from '@/data/timetables/GTX-A.json'
import tt_gk from '@/data/timetables/경강.json'
import tt_kj from '@/data/timetables/경의중앙.json'
import tt_kc from '@/data/timetables/경춘.json'
import tt_air from '@/data/timetables/공항철도.json'
import tt_kg from '@/data/timetables/김포골드라인.json'
import tt_sh from '@/data/timetables/서해.json'
import tt_sb from '@/data/timetables/수인분당.json'
import tt_sl from '@/data/timetables/신림선.json'
import tt_sbd from '@/data/timetables/신분당선.json'
import tt_yi from '@/data/timetables/용인경전철.json'
import tt_ui from '@/data/timetables/우이신설.json'
import tt_ej from '@/data/timetables/의정부경전철.json'
import tt_ic1 from '@/data/timetables/인천1호선.json'
import tt_ic2 from '@/data/timetables/인천2호선.json'

type TimetableItem = { d: string; e: string }
type StationTimetable = Record<'01' | '02' | '03', Record<'U' | 'D', TimetableItem[]>>
type LineTimetable = Record<string, StationTimetable>

const TIMETABLES: Record<string, LineTimetable> = {
  '1호선': tt_1 as unknown as LineTimetable,
  '2호선': tt_2 as unknown as LineTimetable,
  '3호선': tt_3 as unknown as LineTimetable,
  '4호선': tt_4 as unknown as LineTimetable,
  '5호선': tt_5 as unknown as LineTimetable,
  '6호선': tt_6 as unknown as LineTimetable,
  '7호선': tt_7 as unknown as LineTimetable,
  '8호선': tt_8 as unknown as LineTimetable,
  '9호선': tt_9 as unknown as LineTimetable,
  'GTX-A': tt_gtxa as unknown as LineTimetable,
  '경강': tt_gk as unknown as LineTimetable,
  '경의중앙': tt_kj as unknown as LineTimetable,
  '경춘': tt_kc as unknown as LineTimetable,
  '공항철도': tt_air as unknown as LineTimetable,
  '김포골드라인': tt_kg as unknown as LineTimetable,
  '서해': tt_sh as unknown as LineTimetable,
  '수인분당': tt_sb as unknown as LineTimetable,
  '신림선': tt_sl as unknown as LineTimetable,
  '신분당선': tt_sbd as unknown as LineTimetable,
  '용인경전철': tt_yi as unknown as LineTimetable,
  '우이신설': tt_ui as unknown as LineTimetable,
  '의정부경전철': tt_ej as unknown as LineTimetable,
  '인천1호선': tt_ic1 as unknown as LineTimetable,
  '인천2호선': tt_ic2 as unknown as LineTimetable,
}

type ApiMapEntry = { realtimeApiName?: string; tagoStationId?: string; stationCd?: string }
const MAP = apiMap as Record<string, ApiMapEntry>

const REALTIME_BASE = 'http://swopenapi.seoul.go.kr/api/subway'

const SUBWAY_ID_TO_LOCAL_LINE: Record<string, string> = {
  '1001': '1호선', '1002': '2호선', '1003': '3호선', '1004': '4호선',
  '1005': '5호선', '1006': '6호선', '1007': '7호선', '1008': '8호선', '1009': '9호선',
  '1032': 'GTX-A', '1061': '경의중앙', '1063': '경의중앙',
  '1065': '공항철도', '1067': '경춘', '1075': '수인분당',
  '1077': '신분당선', '1081': '경강', '1092': '우이신설',
  '1093': '서해', '1094': '신림선',
}

const LINE_ORDER = [
  '1호선', '2호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선', '9호선',
  '경의중앙', '공항철도', '경춘', '수인분당', '신분당선', '경강', '서해', '우이신설',
  '신림선', 'GTX-A', '인천1호선', '인천2호선', '용인경전철', '김포골드라인', '의정부경전철',
]

// ─────────────────────────────────────────
// KST helpers (Vercel 등 UTC 서버 대응 필수)
// ─────────────────────────────────────────

function kstNow(): { day: number; secOfDay: number; iso: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const y = get('year'), mo = get('month'), d = get('day')
  const h = parseInt(get('hour'), 10)
  const m = parseInt(get('minute'), 10)
  const s = parseInt(get('second'), 10)
  const wd = get('weekday')
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    day: dayMap[wd] ?? 1,
    secOfDay: h * 3600 + m * 60 + s,
    iso: `${y}-${mo}-${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}+09:00`,
  }
}

function todayCode(day: number): '01' | '02' | '03' {
  if (day === 0) return '03'
  if (day === 6) return '02'
  return '01'
}

function padTime(t: string): string {
  if (!t || t === '0' || t.length < 4) return ''
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`
}

function timeToSec(hhmmss: string): number | null {
  if (!hhmmss || hhmmss.length < 4) return null
  const h = parseInt(hhmmss.slice(0, 2), 10)
  const m = parseInt(hhmmss.slice(2, 4), 10)
  const s = hhmmss.length >= 6 ? parseInt(hhmmss.slice(4, 6), 10) : 0
  if (isNaN(h) || isNaN(m)) return null
  return h * 3600 + m * 60 + s
}

// ─────────────────────────────────────────
// Realtime API
// ─────────────────────────────────────────

type RealtimeItem = {
  subwayId: string
  updnLine: string
  bstatnNm: string
  btrainSttus: string
  barvlDt: string
  arvlMsg2: string
  arvlMsg3: string
  arvlCd: string
  lstcarAt: string
  recptnDt: string
  statnNm: string
}

async function fetchRealtime(statnNm: string, key: string): Promise<{ items: RealtimeItem[]; recptnDt?: string }> {
  const url = `${REALTIME_BASE}/${encodeURIComponent(key)}/json/realtimeStationArrival/0/30/${encodeURIComponent(statnNm)}`
  try {
    const res = await fetch(url, { next: { revalidate: 15 } })
    if (!res.ok) {
      console.error(`[arrivals] realtime HTTP ${res.status} for ${statnNm}`)
      return { items: [] }
    }
    const data = await res.json()
    const em = data?.errorMessage
    if (em?.code && em.code !== 'INFO-000') {
      if (em.code !== 'INFO-200') console.error(`[arrivals] realtime ${em.code}: ${em.message}`)
      return { items: [] }
    }
    const arr: RealtimeItem[] = data?.realtimeArrivalList ?? []
    return { items: arr, recptnDt: arr[0]?.recptnDt }
  } catch (e) {
    console.error(`[arrivals] realtime fetch fail ${statnNm}:`, e)
    return { items: [] }
  }
}

const ARVL_CD_MSG: Record<string, string> = {
  '0': '진입',
  '1': '도착',
  '2': '출발',
  '3': '전역출발',
  '4': '전역진입',
  '5': '전역도착',
}

function realtimeToIso(recptnDt: string): string | undefined {
  if (!recptnDt) return undefined
  const [d, t] = recptnDt.split(' ')
  if (!d || !t) return undefined
  return `${d}T${t}+09:00`
}

// ─────────────────────────────────────────
// Static Timetable Lookup
// ─────────────────────────────────────────

/**
 * 노선 + station lookup key (stationCd 우선, 없으면 tagoStationId) → 정적 시간표
 * 1~9호선은 stationCd 사용, 그 외는 tagoStationId 사용.
 */
function lookupTimetable(line: string, entry: ApiMapEntry): StationTimetable | null {
  const lineData = TIMETABLES[line]
  if (!lineData) return null
  const key = entry.stationCd ?? entry.tagoStationId
  if (!key) return null
  return lineData[key] ?? null
}

/**
 * 정적 timetable에서 다음 열차 pick.
 * 02(토) 데이터 없으면 03(휴일)로 fallback — TAGO 코레일 광역철도 특성.
 */
function pickNextFromStatic(
  timetable: StationTimetable,
  line: string,
  dailyCode: '01' | '02' | '03',
  nowSec: number,
): Arrival[] {
  const pick = (dir: 'U' | 'D', dirLabel: string): Arrival[] => {
    let items = timetable[dailyCode][dir]
    if (items.length === 0 && dailyCode === '02') items = timetable['03'][dir]
    return items
      .map(it => {
        const t = timeToSec(it.d)
        return t !== null ? { it, t } : null
      })
      .filter((x): x is { it: TimetableItem; t: number } => !!x && x.t >= nowSec)
      .sort((a, b) => a.t - b.t)
      .slice(0, 2)
      .map(({ it, t }) => ({
        line,
        dir: dirLabel,
        dest: it.e,
        sec: t - nowSec,
        msg: `${padTime(it.d)} 출발 예정`,
        source: 'timetable' as const,
      }))
  }
  return [...pick('U', '상행'), ...pick('D', '하행')]
}

// ─────────────────────────────────────────
// Route
// ─────────────────────────────────────────

function sortArrivals(a: Arrival, b: Arrival): number {
  const la = LINE_ORDER.indexOf(a.line)
  const lb = LINE_ORDER.indexOf(b.line)
  if (la !== lb) return (la === -1 ? 999 : la) - (lb === -1 ? 999 : lb)
  if (a.source !== b.source) return a.source === 'realtime' ? -1 : 1
  if (a.dir !== b.dir) return a.dir.localeCompare(b.dir)
  return (a.sec ?? Infinity) - (b.sec ?? Infinity)
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids')
  if (!idsParam) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ error: 'no valid ids' }, { status: 400 })

  const realtimeKey = process.env.SEOUL_REALTIME_API_KEY
  const kst = kstNow()
  const dailyCode = todayCode(kst.day)

  const targets = ids.map(id => {
    const line = id.split(':')[0]
    const entry = MAP[id]
    return { id, line, entry }
  })

  // Realtime fetch (statnNm dedup)
  const rtNames = new Set<string>()
  const rtLinesRequested = new Set<string>()
  for (const t of targets) {
    if (t.entry?.realtimeApiName) {
      rtNames.add(t.entry.realtimeApiName)
      rtLinesRequested.add(t.line)
    }
  }

  const arrivals: Arrival[] = []
  let generatedAt: string | undefined
  let realtimeCount = 0
  let timetableCount = 0

  const rtPromise = realtimeKey && rtNames.size > 0
    ? Promise.all(Array.from(rtNames).map(name => fetchRealtime(name, realtimeKey)))
    : Promise.resolve([])

  const rtResults = await rtPromise

  for (const r of rtResults) {
    if (!generatedAt && r.recptnDt) generatedAt = realtimeToIso(r.recptnDt)
    for (const it of r.items) {
      const localLine = SUBWAY_ID_TO_LOCAL_LINE[it.subwayId]
      if (!localLine || !rtLinesRequested.has(localLine)) continue
      arrivals.push({
        line: localLine,
        dir: it.updnLine || '',
        dest: it.bstatnNm,
        sec: parseInt(it.barvlDt, 10) || 0,
        msg: ARVL_CD_MSG[it.arvlCd] || '',
        trainType: it.btrainSttus || undefined,
        isLast: it.lstcarAt === '1',
        source: 'realtime',
      })
      realtimeCount++
    }
  }

  // 정적 시간표 lookup (동기 처리 — 파일 로드는 module scope에서 이미 완료)
  for (const t of targets) {
    if (!t.entry) continue
    const timetable = lookupTimetable(t.line, t.entry)
    if (!timetable) continue
    const staticArrivals = pickNextFromStatic(timetable, t.line, dailyCode, kst.secOfDay)
    for (const a of staticArrivals) {
      arrivals.push(a)
      timetableCount++
    }
  }

  arrivals.sort(sortArrivals)

  const source: ArrivalsResponse['source'] =
    realtimeCount > 0 && timetableCount > 0 ? 'mixed'
    : realtimeCount > 0 ? 'realtime'
    : timetableCount > 0 ? 'timetable'
    : 'none'

  const noMapping = targets.every(t => !t.entry || (!t.entry.realtimeApiName && !t.entry.tagoStationId && !t.entry.stationCd))
  const warning = noMapping ? '해당 역은 정보 제공 대상이 아닙니다.' : undefined

  const body: ArrivalsResponse = { source, arrivals, generatedAt: generatedAt ?? kst.iso, warning }

  return NextResponse.json(body, {
    headers: {
      // 클라이언트/CDN 캐시. realtime revalidate와 동일 15s. stale-while-revalidate로 부담 완화.
      'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=30',
    },
  })
}
