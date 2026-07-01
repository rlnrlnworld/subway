'use client'
import { useCallback, useEffect, useRef } from 'react'
import { TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { DotTooltip } from './DotTooltip'
import { InvertedWheelZoom } from './InvertedWheelZoom'
import { MapSvg } from './MapSvg'
import { Minimap } from './Minimap'
import { StationDetailPanel } from './StationDetailPanel'
import { dotGroupsByKey, viewBox } from './data'
import { FOCUS_ANIM_MS, FOCUS_SCALE, PANEL_RIGHT_MARGIN_PX, PANEL_VW } from './config'
import { useMapStore } from '@/store/mapStore'

type Props = { containerRef: React.RefObject<HTMLDivElement | null> }

export function MapContent({ containerRef }: Props) {
  const selectedDot = useMapStore((s) => s.selectedDot)
  const panelOpen = useMapStore((s) => s.panelOpen)
  const { setTransform } = useControls()

  const prevKey = useRef<string | null>(null)
  const prevOpen = useRef(false)

  const focusOn = useCallback((svgX: number, svgY: number, rightInsetPx = 0) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const fit = Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
    const svgW = viewBox.width * fit
    const svgH = viewBox.height * fit
    const offsetX = (rect.width - svgW) / 2
    const offsetY = (rect.height - svgH) / 2
    const svgPixelX = offsetX + (svgX - viewBox.x) * fit
    const svgPixelY = offsetY + (svgY - viewBox.y) * fit
    const targetCenterX = (rect.width - rightInsetPx) / 2
    const targetPosX = targetCenterX - svgPixelX * FOCUS_SCALE
    const targetPosY = rect.height / 2 - svgPixelY * FOCUS_SCALE
    setTransform(targetPosX, targetPosY, FOCUS_SCALE, FOCUS_ANIM_MS, 'easeOut')
  }, [containerRef, setTransform])

  // selectedDot / panelOpen 변경 시 focus 재조준
  useEffect(() => {
    const keyChanged = selectedDot?.key !== prevKey.current
    const openChanged = panelOpen !== prevOpen.current
    if (selectedDot && (keyChanged || openChanged)) {
      const inset = panelOpen
        ? window.innerWidth * (PANEL_VW / 100) + PANEL_RIGHT_MARGIN_PX
        : 0
      focusOn(selectedDot.svgX, selectedDot.svgY, inset)
    }
    prevKey.current = selectedDot?.key ?? null
    prevOpen.current = panelOpen
  }, [selectedDot, panelOpen, focusOn])

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = (e.target as Element).closest('.station-dot') as SVGElement | null
    const { selectedDot: current, selectDot, clearDot } = useMapStore.getState()
    if (!target) {
      clearDot()
      return
    }
    const key = target.dataset.key
    if (!key) return
    const group = dotGroupsByKey.get(key)
    if (!group) return
    if (current?.key === key) {
      clearDot()
      return
    }
    selectDot({
      key,
      name: group.name,
      svgX: group.x,
      svgY: group.y,
      lines: group.lines,
    })
  }, [])

  // .selected 클래스 sync (DOM 직접 조작 — MapSvg 재렌더 회피)
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    root.querySelectorAll('.station-dot.selected').forEach(el => el.classList.remove('selected'))
    if (selectedDot) {
      const next = root.querySelector(`.station-dot[data-key="${CSS.escape(selectedDot.key)}"]`)
      next?.classList.add('selected')
    }
  }, [selectedDot, containerRef])

  return (
    <>
      <InvertedWheelZoom>
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <MapSvg onClick={handleClick} />
        </TransformComponent>
      </InvertedWheelZoom>
      <Minimap />
      {selectedDot && <DotTooltip containerRef={containerRef} />}
      <StationDetailPanel />
    </>
  )
}
