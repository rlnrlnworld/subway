import { NextRequest, NextResponse } from 'next/server'
import apiMap from '@/data/station-api-map.json'
import type { Arrival, ArrivalsResponse } from '@/types/arrivals'

type ApiMapEntry = { realtimeApiName?: string; tagoStationId?: string }
const MAP = apiMap as Record<string, ApiMapEntry>

const REALTIME_BASE = 'http://swopenapi.seoul.go.kr/api/subway'
const TAGO_BASE = 'https://apis.data.go.kr/1613000/SubwayInfo'

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
      // 데이터 없음(빈 응답)은 정상 케이스로 취급 (첫차 이전 등)
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

function realtimeToIso(recptnDt: string): string | undefined {
  if (!recptnDt) return undefined
  // "2026-07-01 09:49:41" → ISO
  const [d, t] = recptnDt.split(' ')
  if (!d || !t) return undefined
  return `${d}T${t}+09:00`
}

// ─────────────────────────────────────────
// TAGO Timetable
// ─────────────────────────────────────────

type TagoItem = {
  endSubwayStationNm: string
  depTime: string
  arrTime: string
  upDownTypeCode: string
}

function timeToSec(hhmmss: string): number | null {
  if (!hhmmss || hhmmss.length < 4) return null
  const h = parseInt(hhmmss.slice(0, 2), 10)
  const m = parseInt(hhmmss.slice(2, 4), 10)
  const s = hhmmss.length >= 6 ? parseInt(hhmmss.slice(4, 6), 10) : 0
  if (isNaN(h) || isNaN(m)) return null
  return h * 3600 + m * 60 + s
}

async function fetchTagoTimetable(stationId: string, dir: 'U' | 'D', dailyCode: string, key: string): Promise<TagoItem[]> {
  const params = new URLSearchParams({
    serviceKey: key,
    subwayStationId: stationId,
    dailyTypeCode: dailyCode,
    upDownTypeCode: dir,
    _type: 'json',
    numOfRows: '400',
    pageNo: '1',
  })
  try {
    const res = await fetch(`${TAGO_BASE}/GetSubwaySttnAcctoSchdulList?${params}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      console.error(`[arrivals] tago HTTP ${res.status} for ${stationId}/${dir}`)
      return []
    }
    const data = await res.json()
    const items = data?.response?.body?.items?.item
    if (!items) return []
    return Array.isArray(items) ? items : [items]
  } catch (e) {
    console.error(`[arrivals] tago fetch fail ${stationId}/${dir}:`, e)
    return []
  }
}

async function tagoNextArrivals(
  entry: { tagoStationId: string; line: string },
  dailyCode: string,
  nowSec: number,
  key: string,
): Promise<Arrival[]> {
  const [up, down] = await Promise.all([
    fetchTagoTimetable(entry.tagoStationId, 'U', dailyCode, key),
    fetchTagoTimetable(entry.tagoStationId, 'D', dailyCode, key),
  ])

  const pickNext = (items: TagoItem[], dirLabel: string): Arrival[] => {
    return items
      .map(it => {
        const t = timeToSec(it.depTime)
        return t !== null ? { it, t } : null
      })
      .filter((x): x is { it: TagoItem; t: number } => !!x && x.t >= nowSec)
      .sort((a, b) => a.t - b.t)
      .slice(0, 2)
      .map(({ it, t }) => ({
        line: entry.line,
        dir: dirLabel,
        dest: it.endSubwayStationNm,
        sec: t - nowSec,
        msg: `${padTime(it.depTime)} 출발 예정`,
        source: 'timetable' as const,
      }))
  }

  return [...pickNext(up, '상행'), ...pickNext(down, '하행')]
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
  const tagoKey = process.env.TAGO_API_KEY
  const kst = kstNow()
  const dailyCode = todayCode(kst.day)

  const targets = ids.map(id => {
    const line = id.split(':')[0]
    const entry = MAP[id]
    return { id, line, entry }
  })

  // Realtime: statnNm dedup
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

  const tagoTargets = targets.filter(t => t.entry?.tagoStationId)
  const tagoPromise = tagoKey && tagoTargets.length > 0
    ? Promise.all(tagoTargets.map(t =>
        tagoNextArrivals({ tagoStationId: t.entry!.tagoStationId!, line: t.line }, dailyCode, kst.secOfDay, tagoKey)))
    : Promise.resolve([])

  const [rtResults, tagoResults] = await Promise.all([rtPromise, tagoPromise])

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
        msg: it.arvlMsg2 || '',
        trainType: it.btrainSttus || undefined,
        isLast: it.lstcarAt === '1',
        source: 'realtime',
      })
      realtimeCount++
    }
  }

  for (const a of tagoResults.flat()) {
    arrivals.push(a)
    timetableCount++
  }

  arrivals.sort(sortArrivals)

  const source: ArrivalsResponse['source'] =
    realtimeCount > 0 && timetableCount > 0 ? 'mixed'
    : realtimeCount > 0 ? 'realtime'
    : timetableCount > 0 ? 'timetable'
    : 'none'

  const noMapping = targets.every(t => !t.entry || (!t.entry.realtimeApiName && !t.entry.tagoStationId))
  const warning = noMapping ? '해당 역은 정보 제공 대상이 아닙니다.' : undefined

  const body: ArrivalsResponse = { source, arrivals, generatedAt: generatedAt ?? kst.iso, warning }

  return NextResponse.json(body, {
    headers: {
      // 클라이언트/CDN 캐시. realtime revalidate와 동일 15s. stale-while-revalidate로 부담 완화.
      'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=30',
    },
  })
}
