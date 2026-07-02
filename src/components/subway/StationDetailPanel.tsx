'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  activeLines,
  dotGroupsByName,
  findNeighbors,
} from './data'
import { ACTIVE_LINES } from './config'
import { useMapStore } from '@/store/mapStore'
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
  const displayText = isMulti ? candidates.join(' / ') : candidates[0]

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
              {name}
            </button>
          ))}
        </div>
      )}
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
        {/* TODO: 실시간/시간표 데이터 렌더 */}
      </div>
    </aside>
  )
}
