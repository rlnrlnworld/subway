'use client'
import { useRef } from 'react'
import { TransformWrapper } from 'react-zoom-pan-pinch'
import { MapContent } from './subway/MapContent'
import { INITIAL_SCALE } from './subway/config'

export default function SubwayMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={containerRef} className="relative w-full h-full">
      <TransformWrapper
        initialScale={INITIAL_SCALE}
        minScale={0.5}
        maxScale={8}
        centerOnInit
        wheel={{ disabled: true }}
        doubleClick={{ disabled: true }}
      >
        <MapContent containerRef={containerRef} />
      </TransformWrapper>
    </div>
  )
}
