'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { dotGroups, lineColorMap } from './data'
import { useMapStore } from '@/store/mapStore'
import type { DotGroup } from './types'

const MAX_RESULTS = 8

export function StationSearch() {
  const panelOpen = useMapStore((s) => s.panelOpen)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const results = useMemo<DotGroup[]>(() => {
    const term = q.trim()
    if (!term) return []
    const out: DotGroup[] = []
    const seen = new Set<string>()
    for (const g of dotGroups) {
      if (!g.name.includes(term)) continue
      if (seen.has(g.key)) continue
      seen.add(g.key)
      out.push(g)
      if (out.length >= MAX_RESULTS) break
    }
    return out
  }, [q])

  useEffect(() => { setActiveIdx(0) }, [q])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pick = (g: DotGroup) => {
    const { selectDot, openPanel } = useMapStore.getState()
    selectDot({
      key: g.key,
      name: g.name,
      svgX: g.x,
      svgY: g.y,
      lines: g.lines,
    })
    openPanel()
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  if (panelOpen) return null

  return (
    <div ref={wrapRef} className="station-search-wrap">
      <div className="station-search-box">
        <svg className="station-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={q}
          placeholder="역 검색"
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          aria-label="역 검색"
        />
        {q && (
          <button
            type="button"
            className="station-search-clear"
            aria-label="검색어 지우기"
            onClick={() => { setQ(''); inputRef.current?.focus() }}
          >
            ×
          </button>
        )}
      </div>
      {open && q.trim() && (
        <ul className="station-search-list" role="listbox">
          {results.length === 0 && (
            <li className="station-search-empty">일치하는 역이 없어요</li>
          )}
          {results.map((g, i) => (
            <li
              key={g.key}
              role="option"
              aria-selected={i === activeIdx}
              className={`station-search-item ${i === activeIdx ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(g) }}
            >
              <span className="station-search-name">{g.name}</span>
              <span className="station-search-lines">
                {g.lines.map((ln) => (
                  <span
                    key={ln}
                    className="station-search-line-dot"
                    style={{ background: lineColorMap.get(ln) ?? '#999' }}
                    title={ln}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
