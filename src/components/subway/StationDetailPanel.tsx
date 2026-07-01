'use client'
import { activeLines } from './data'
import { ACTIVE_LINES } from './config'
import { useMapStore } from '@/store/mapStore'
import type { Line } from './types'

export function StationDetailPanel() {
  const dot = useMapStore((s) => s.selectedDot)
  const open = useMapStore((s) => s.panelOpen)
  const closePanel = useMapStore((s) => s.closePanel)

  const lineMeta: Line[] = dot
    ? dot.lines
        .map((name) => activeLines.find((l) => l.name === name))
        .filter((l): l is Line => Boolean(l))
        .sort((a, b) => ACTIVE_LINES.indexOf(a.name) - ACTIVE_LINES.indexOf(b.name))
    : []
  const displayName = dot ? dot.name.replace(/\(.+?\)/g, '').trim() : ''

  return (
    <aside
      className={`station-panel${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      role="dialog"
    >
      <header className="station-panel-header">
        <div className="station-panel-title">
          <div className="station-panel-badges">
            {lineMeta.map((l) => (
              <span
                key={l.name}
                className="line-badge"
                style={{ background: l.color }}
                title={l.name}
              >
                {l.label}
              </span>
            ))}
          </div>
          <h2 className="station-panel-name">{displayName}</h2>
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
