'use client'
import { useEffect, useRef } from 'react'
import { useControls } from 'react-zoom-pan-pinch'

export function InvertedWheelZoom({ children }: { children: React.ReactNode }) {
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
