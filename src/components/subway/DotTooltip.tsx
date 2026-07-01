'use client'
import { useLayoutEffect, useRef } from 'react'
import {
  arrow,
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react'
import { useTransformEffect } from 'react-zoom-pan-pinch'
import { activeLines } from './data'
import { ACTIVE_LINES } from './config'
import type { Line, SelectedDot } from './types'

const TOOLTIP_OFFSET = 10
const ARROW_SIZE = 14 // rotated square 대각선 tip 반영
const ARROW_HALF = ARROW_SIZE / 2

type Props = {
  dot: SelectedDot
  containerRef: React.RefObject<HTMLDivElement | null>
  onOpenPanel: () => void
}

export function DotTooltip({ dot, containerRef, onOpenPanel }: Props) {
  const arrowRef = useRef<HTMLDivElement>(null)

  const { refs, floatingStyles, middlewareData, placement, update } = useFloating({
    placement: 'top',
    middleware: [
      offset(TOOLTIP_OFFSET),
      flip({ padding: 12 }),
      shift({ padding: 12 }),
      arrow({ element: arrowRef, padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
    strategy: 'fixed',
  })

  // dot 엘리먼트를 reference로 지정
  useLayoutEffect(() => {
    const dotEl = containerRef.current?.querySelector(
      `.station-dot[data-key="${CSS.escape(dot.key)}"]`
    )
    if (dotEl) refs.setReference(dotEl as Element)
  }, [dot.key, refs, containerRef])

  // pan/zoom 시 위치 재계산
  useTransformEffect(() => { update() })

  const side = placement.split('-')[0] as 'top' | 'right' | 'bottom' | 'left'
  const staticSide = ({ top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const)[side]

  const arrowX = middlewareData.arrow?.x
  const arrowY = middlewareData.arrow?.y

  // 노선 뱃지 데이터 — ACTIVE_LINES 순서대로 정렬
  const lineMeta: Line[] = dot.lines
    .map(name => activeLines.find(l => l.name === name))
    .filter((l): l is Line => Boolean(l))
    .sort((a, b) => ACTIVE_LINES.indexOf(a.name) - ACTIVE_LINES.indexOf(b.name))

  // 괄호 제거된 역 이름 (지도 라벨과 동일 규칙)
  const displayName = dot.name.replace(/\(.+?\)/g, '').trim()

  return (
    <FloatingPortal>
      <div ref={refs.setFloating} style={floatingStyles} className="dot-tooltip-floating">
        <div className="dot-tooltip">
          <button
            type="button"
            className="dot-tooltip-header"
            onClick={onOpenPanel}
            aria-label={`${displayName} 상세 열기`}
          >
            <div className="dot-tooltip-badges">
              {lineMeta.map(l => (
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
            <h3 className="dot-tooltip-name">{displayName}</h3>
            <svg
              className="dot-tooltip-chevron"
              width="16"
              height="16"
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
          </button>
        </div>
        <div
          ref={arrowRef}
          className="dot-tooltip-tail"
          style={{
            left: arrowX != null ? `${arrowX}px` : undefined,
            top: arrowY != null ? `${arrowY}px` : undefined,
            [staticSide]: `-${ARROW_HALF - 1}px`,
          }}
        />
      </div>
    </FloatingPortal>
  )
}
