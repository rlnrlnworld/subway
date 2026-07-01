'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { DotTooltip } from './DotTooltip'
import { InvertedWheelZoom } from './InvertedWheelZoom'
import { MapSvg } from './MapSvg'
import { Minimap } from './Minimap'
import { StationDetailPanel } from './StationDetailPanel'
import { dotGroupsByKey, viewBox } from './data'
import { FOCUS_ANIM_MS, FOCUS_SCALE, PANEL_VW } from './config'
import type { SelectedDot } from './types'

type Props = { containerRef: React.RefObject<HTMLDivElement | null> }

export function MapContent({ containerRef }: Props) {
  const [selectedDot, setSelectedDot] = useState<SelectedDot | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const selectedRef = useRef<SelectedDot | null>(null)
  const panelOpenRef = useRef(false)
  const { setTransform } = useControls()

  // 현재 selected를 ref로 미러링 (handleClick을 stable 유지 → MapSvg memo hit)
  useEffect(() => {
    selectedRef.current = selectedDot
  }, [selectedDot])
  useEffect(() => {
    panelOpenRef.current = panelOpen
  }, [panelOpen])

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

  const currentInset = useCallback(() => {
    return panelOpenRef.current ? window.innerWidth * (PANEL_VW / 100) : 0
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = (e.target as Element).closest('.station-dot') as SVGElement | null
    if (!target) {
      setSelectedDot(null)
      setPanelOpen(false)
      return
    }
    const key = target.dataset.key
    if (!key) return
    const group = dotGroupsByKey.get(key)
    if (!group) return

    if (selectedRef.current?.key === key) {
      setSelectedDot(null)
      setPanelOpen(false)
      return
    }
    setSelectedDot({
      key,
      name: group.name,
      svgX: group.x,
      svgY: group.y,
      lines: group.lines,
    })
    focusOn(group.x, group.y, currentInset())
  }, [focusOn, currentInset])

  const handleOpenPanel = useCallback(() => {
    const sel = selectedRef.current
    if (!sel) return
    setPanelOpen(true)
    focusOn(sel.svgX, sel.svgY, window.innerWidth * (PANEL_VW / 100))
  }, [focusOn])

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false)
    const sel = selectedRef.current
    if (sel) focusOn(sel.svgX, sel.svgY, 0)
  }, [focusOn])

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
      {selectedDot && (
        <DotTooltip
          dot={selectedDot}
          containerRef={containerRef}
          onOpenPanel={handleOpenPanel}
        />
      )}
      <StationDetailPanel dot={selectedDot} open={panelOpen} onClose={handleClosePanel} />
    </>
  )
}
