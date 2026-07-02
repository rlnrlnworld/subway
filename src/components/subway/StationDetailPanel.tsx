'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  activeLines,
  dotGroupsByKey,
  dotGroupsByName,
  findNeighbors,
} from './data'
import { ACTIVE_LINES } from './config'
import { useMapStore } from '@/store/mapStore'
import { preloadArrivals, useArrivals } from '@/hooks/useArrivals'
import type { Arrival } from '@/types/arrivals'
import type { Line } from './types'

function ChevronLeft() {
  return (
    <svg
      className="station-panel-sign-chevron"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function ChevronRight() {
  return (
    <svg
      className="station-panel-sign-chevron"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function NeighborLink({
  candidates,
  side,
  onNavigate,
}: {
  candidates: string[]
  side: 'prev' | 'next'
  onNavigate: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (candidates.length === 0) return null

  const isMulti = candidates.length > 1
  const strip = (n: string) => n.replace(/\(.+?\)/g, '').trim()
  const displayText = isMulti
    ? candidates.map(strip).join(' / ')
    : strip(candidates[0])

  return (
    <div
      ref={wrapRef}
      className={`station-panel-sign-slot station-panel-sign-slot-${side}`}
    >
      <button
        type="button"
        className={`station-panel-sign-label station-panel-sign-label-${side}`}
        onClick={() => {
          if (isMulti) setOpen((o) => !o)
          else onNavigate(candidates[0])
        }}
        aria-label={
          side === 'prev' ? `이전 역: ${displayText}` : `다음 역: ${displayText}`
        }
        aria-expanded={isMulti ? open : undefined}
      >
        {side === 'prev' && <ChevronLeft />}
        <span className="station-panel-sign-label-text">{displayText}</span>
        {side === 'next' && <ChevronRight />}
      </button>
      {isMulti && open && (
        <div className={`station-panel-picker station-panel-picker-${side}`}>
          {candidates.map((name) => (
            <button
              key={name}
              type="button"
              className="station-panel-picker-item"
              onClick={() => {
                setOpen(false)
                onNavigate(name)
              }}
            >
              {strip(name)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type ArrivalTab = 'realtime' | 'timetable'

const TAB_LABEL: Record<ArrivalTab, string> = {
  realtime: '실시간',
  timetable: '시간표',
}

function formatSec(sec: number | null): string {
  if (sec == null) return ''
  if (sec <= 0) return '곧 도착'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}초`
  if (s === 0) return `${m}분`
  return `${m}분 ${s}초`
}

function formatRefreshedAt(ts: number | null): string {
  if (ts == null) return ''
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s} 갱신`
}

function ArrivalItem({ arrival, elapsedSec }: { arrival: Arrival; elapsedSec: number }) {
  const adjusted =
    arrival.sec == null ? null : Math.max(0, arrival.sec - elapsedSec)
  const secText = formatSec(adjusted)
  const showExpress = arrival.trainType && arrival.trainType !== '일반'

  return (
    <article className="station-panel-arrivals-item">
      <span className="station-panel-arrivals-item-dest">
        {arrival.dest}행
        {showExpress && (
          <span className="station-panel-arrivals-tag station-panel-arrivals-tag-express">
            {arrival.trainType}
          </span>
        )}
        {arrival.isLast && (
          <span className="station-panel-arrivals-tag station-panel-arrivals-tag-last">
            막차
          </span>
        )}
      </span>
      {secText && <span className="station-panel-arrivals-item-sec">{secText}</span>}
    </article>
  )
}

function ArrivalsList({
  arrivals,
  elapsedSec,
}: {
  arrivals: Arrival[]
  elapsedSec: number
}) {
  const { upLabel, upList, downLabel, downList } = useMemo(() => {
    const up: Arrival[] = []
    const down: Arrival[] = []
    let upLabel = '상행'
    let downLabel = '하행'
    for (const a of arrivals) {
      const d = a.dir || ''
      if (d.startsWith('상') || d.startsWith('내')) {
        up.push(a)
        if (d) upLabel = d
      } else if (d.startsWith('하') || d.startsWith('외')) {
        down.push(a)
        if (d) downLabel = d
      }
    }
    const bySec = (a: Arrival, b: Arrival) => (a.sec ?? Infinity) - (b.sec ?? Infinity)
    up.sort(bySec)
    down.sort(bySec)
    return {
      upLabel,
      downLabel,
      upList: up.slice(0, 2),
      downList: down.slice(0, 2),
    }
  }, [arrivals])

  if (upList.length === 0 && downList.length === 0) {
    return (
      <p className="station-panel-arrivals-empty">현재 도착 예정 열차가 없습니다.</p>
    )
  }

  return (
    <div className="station-panel-arrivals-columns">
      <section className="station-panel-arrivals-section" aria-label={upLabel}>
        <h3 className="station-panel-arrivals-section-title">{upLabel}</h3>
        <div className="station-panel-arrivals-list">
          {upList.length > 0 ? (
            upList.map((a, i) => (
              <ArrivalItem
                key={`u-${a.dest}-${a.sec}-${i}`}
                arrival={a}
                elapsedSec={elapsedSec}
              />
            ))
          ) : (
            <p className="station-panel-arrivals-empty station-panel-arrivals-empty-slim">
              도착 정보 없음
            </p>
          )}
        </div>
      </section>
      <section className="station-panel-arrivals-section" aria-label={downLabel}>
        <h3 className="station-panel-arrivals-section-title">{downLabel}</h3>
        <div className="station-panel-arrivals-list">
          {downList.length > 0 ? (
            downList.map((a, i) => (
              <ArrivalItem
                key={`d-${a.dest}-${a.sec}-${i}`}
                arrival={a}
                elapsedSec={elapsedSec}
              />
            ))
          ) : (
            <p className="station-panel-arrivals-empty station-panel-arrivals-empty-slim">
              도착 정보 없음
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function ArrivalsBody({
  ids,
  lineColor,
}: {
  ids: string[] | null
  lineColor: string
}) {
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null)
  const baselineRef = useRef(Date.now())
  const { arrivals, warning, isLoading, error, hasData } = useArrivals(ids, {
    // deep-equal 응답이든 아니든 fetch 완료마다 발화 → 갱신 시각 + 카운트다운 baseline 동기화
    onSuccess: () => {
      const now = Date.now()
      setRefreshedAt(now)
      baselineRef.current = now
    },
  })

  // ids 바뀌면 이전 갱신 시각 표시 방지
  const idsKeyStr = ids?.join('|') ?? ''
  useEffect(() => {
    setRefreshedAt(null)
  }, [idsKeyStr])

  // 1s 카운트다운: hasData 동안만 tick
  const [nowTick, setNowTick] = useState(0)
  useEffect(() => {
    if (!hasData) return
    const id = window.setInterval(() => setNowTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [hasData])
  const elapsedSec = hasData
    ? Math.floor((Date.now() - baselineRef.current) / 1000)
    : 0
  void nowTick // tick으로 re-render 트리거만, 값 미사용

  const realtimeList = useMemo(
    () => arrivals.filter((a) => a.source === 'realtime'),
    [arrivals],
  )
  const timetableList = useMemo(
    () => arrivals.filter((a) => a.source === 'timetable'),
    [arrivals],
  )

  const [tab, setTab] = useState<ArrivalTab>('realtime')
  const [tabTouched, setTabTouched] = useState(false)

  // 사용자가 탭을 안 만졌을 때만 데이터 기반 자동 선택
  useEffect(() => {
    if (tabTouched) return
    if (realtimeList.length > 0) setTab('realtime')
    else if (timetableList.length > 0) setTab('timetable')
  }, [realtimeList.length, timetableList.length, tabTouched])

  // 역 바뀌면 탭 자동 선택 상태 초기화
  const idsKey = ids?.join('|') ?? ''
  useEffect(() => {
    setTabTouched(false)
  }, [idsKey])

  if (warning) {
    return (
      <div className="station-panel-arrivals">
        <p className="station-panel-arrivals-warning">{warning}</p>
      </div>
    )
  }

  if (isLoading && !hasData) {
    return (
      <div
        className="station-panel-arrivals"
        aria-busy="true"
        style={{ ['--line-color' as string]: lineColor }}
      >
        <div className="station-panel-arrivals-toolbar">
          <div className="station-panel-arrivals-skeleton-tabs" />
          <div className="station-panel-arrivals-skeleton-updated" />
        </div>
        <div className="station-panel-arrivals-columns">
          <section className="station-panel-arrivals-section">
            <h3 className="station-panel-arrivals-section-title">상행</h3>
            <div className="station-panel-arrivals-list">
              <div className="station-panel-arrivals-skeleton-item" />
              <div className="station-panel-arrivals-skeleton-item" />
            </div>
          </section>
          <section className="station-panel-arrivals-section">
            <h3 className="station-panel-arrivals-section-title">하행</h3>
            <div className="station-panel-arrivals-list">
              <div className="station-panel-arrivals-skeleton-item" />
              <div className="station-panel-arrivals-skeleton-item" />
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="station-panel-arrivals">
        <p className="station-panel-arrivals-empty">도착 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  const activeList = tab === 'realtime' ? realtimeList : timetableList

  return (
    <div
      className="station-panel-arrivals"
      aria-live="polite"
      style={{ ['--line-color' as string]: lineColor }}
    >
      <div className="station-panel-arrivals-toolbar">
        <div
          className="station-panel-arrivals-tabs"
          role="tablist"
          aria-label="도착 정보 유형"
          style={{ ['--tab-index' as string]: tab === 'realtime' ? 0 : 1 }}
        >
          <span className="station-panel-arrivals-tab-indicator" aria-hidden />
          {(['realtime', 'timetable'] as ArrivalTab[]).map((t) => {
            const isActive = tab === t
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`station-panel-arrivals-tab${isActive ? ' is-active' : ''}`}
                onClick={() => {
                  setTab(t)
                  setTabTouched(true)
                }}
              >
                {t === 'realtime' && (
                  <span className="station-panel-arrivals-pulse" aria-hidden />
                )}
                <span>{TAB_LABEL[t]}</span>
              </button>
            )
          })}
        </div>
        {refreshedAt != null && (
          <time
            className="station-panel-arrivals-updated"
            dateTime={new Date(refreshedAt).toISOString()}
          >
            {formatRefreshedAt(refreshedAt)}
          </time>
        )}
      </div>
      <div role="tabpanel">
        <ArrivalsList arrivals={activeList} elapsedSec={elapsedSec} />
      </div>
    </div>
  )
}

export function StationDetailPanel() {
  const dot = useMapStore((s) => s.selectedDot)
  const open = useMapStore((s) => s.panelOpen)
  const selectedLine = useMapStore((s) => s.selectedLine)
  const selectLine = useMapStore((s) => s.selectLine)
  const closePanel = useMapStore((s) => s.closePanel)

  const navigateTo = useCallback((name: string) => {
    const line = useMapStore.getState().selectedLine
    const candidates = dotGroupsByName.get(name) ?? []
    const target =
      (line && candidates.find((g) => g.lines.includes(line))) || candidates[0]
    if (!target) return
    useMapStore.getState().selectDot({
      key: target.key,
      name: target.name,
      svgX: target.x,
      svgY: target.y,
      lines: target.lines,
    })
  }, [])

  const lineMeta: Line[] = dot
    ? dot.lines
        .map((name) => activeLines.find((l) => l.name === name))
        .filter((l): l is Line => Boolean(l))
        .sort((a, b) => ACTIVE_LINES.indexOf(a.name) - ACTIVE_LINES.indexOf(b.name))
    : []
  const displayName = dot ? dot.name.replace(/\(.+?\)/g, '').trim() : ''
  const activeLineColor =
    lineMeta.find((l) => l.name === selectedLine)?.color ?? '#111'
  const neighbors =
    dot && selectedLine
      ? findNeighbors(dot.name, selectedLine)
      : { prev: [], next: [] }
  // 노선 전환도 skeleton 노출 & 서버 부담 절감: 선택 노선 station id 하나만 fetch
  const arrivalsIds = useMemo(() => {
    if (!open || !dot || !selectedLine) return null
    const group = dotGroupsByKey.get(dot.key)
    const target = group?.stations.find((s) => s.line === selectedLine)
    return target ? [target.id] : null
  }, [open, dot, selectedLine])

  // 이웃 역 프리페치 — idle 시점, 본 역 fetch에 영향 안 주도록 지연
  useEffect(() => {
    if (!open || !dot || !selectedLine) return
    const { prev, next } = findNeighbors(dot.name, selectedLine)
    const names = [...prev, ...next]
    if (names.length === 0) return

    const run = () => {
      for (const name of names) {
        const groups = dotGroupsByName.get(name) ?? []
        const group = groups.find((g) => g.lines.includes(selectedLine))
        const station = group?.stations.find((s) => s.line === selectedLine)
        if (station) preloadArrivals([station.id])
      }
    }

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    let handle: number
    let isIdle = false
    if (typeof w.requestIdleCallback === 'function') {
      handle = w.requestIdleCallback(run, { timeout: 1500 })
      isIdle = true
    } else {
      handle = window.setTimeout(run, 500)
    }
    return () => {
      if (isIdle && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(handle)
      } else {
        window.clearTimeout(handle)
      }
    }
  }, [open, dot, selectedLine])

  return (
    <aside
      className={`station-panel${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      role="dialog"
    >
      <header className="station-panel-header">
        <div className="station-panel-title">
          <div className="station-panel-badges">
            {lineMeta.map((l) => {
              const isActive = l.name === selectedLine
              return (
                <button
                  key={l.name}
                  type="button"
                  className={`line-badge${isActive ? ' is-active' : ''}`}
                  style={{ background: l.color }}
                  title={l.name}
                  aria-pressed={isActive}
                  onClick={() => selectLine(l.name)}
                >
                  {l.label}
                </button>
              )
            })}
          </div>
          <div
            className="station-panel-sign"
            style={{ ['--line-color' as string]: activeLineColor }}
          >
            <NeighborLink
              key={`prev:${dot?.key ?? ''}:${selectedLine ?? ''}`}
              candidates={neighbors.prev}
              side="prev"
              onNavigate={navigateTo}
            />
            <NeighborLink
              key={`next:${dot?.key ?? ''}:${selectedLine ?? ''}`}
              candidates={neighbors.next}
              side="next"
              onNavigate={navigateTo}
            />
            <span className="station-panel-sign-rail" aria-hidden="true" />
            <h2 className="station-panel-name">
              <span>{displayName}</span>
            </h2>
            <span className="station-panel-sign-rail" aria-hidden="true" />
          </div>
        </div>
        <button
          type="button"
          className="station-panel-close"
          onClick={closePanel}
          aria-label="닫기"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>
      <div className="station-panel-body">
        {dot && (
          <ArrivalsBody ids={arrivalsIds} lineColor={activeLineColor} />
        )}
      </div>
    </aside>
  )
}
