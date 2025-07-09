'use client'

import { useEffect, useRef, useState } from 'react'

export default function SubwayMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState('')

  const transform = useRef({
    x: 0,
    y: 0,
    scale: 1,
  })

  useEffect(() => {
    fetch('/Seoul_subway_linemap_ko.svg')
      .then(res => res.text())
      .then(raw => {
        const modified = raw
          .replace(/<svg([^>]*)>/, `<svg$1><g id="viewport">`)
          .replace(/<\/svg>/, '</g></svg>')
        setSvgContent(modified)
      })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isDragging = false
    let startX = 0
    let startY = 0

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      startX = e.clientX
      startY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      startX = e.clientX
      startY = e.clientY
      transform.current.x += dx
      transform.current.y += dy
      applyTransform()
    }

    const onMouseUp = () => {
      isDragging = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = -e.deltaY * 0.001
      transform.current.scale *= 1 + delta
      transform.current.scale = Math.max(0.2, Math.min(10, transform.current.scale))
      applyTransform()
    }

    const minimapScale = 0.025

    const applyTransform = () => {
    const svg = container.querySelector('svg')
    const g = svg?.querySelector('#viewport') as SVGGElement
    const { x, y, scale } = transform.current

    if (g)
    g.setAttribute('transform', `translate(${x},${y}) scale(${scale})`)

    const mini = minimapRef.current
    const scope = mini?.querySelector('#scope') as HTMLDivElement
    const miniSvg = mini?.querySelector('svg') as SVGSVGElement
    const miniG = miniSvg?.querySelector('#viewport') as SVGGElement

    if (mini && scope && miniSvg && miniG) {
    const mainW = container.offsetWidth
    const mainH = container.offsetHeight

    const zoomScale = scale
    const totalScale = zoomScale * minimapScale

    const boxW = mainW * minimapScale / zoomScale
    const boxH = mainH * minimapScale / zoomScale
    const boxX = -x * minimapScale / zoomScale
    const boxY = -y * minimapScale / zoomScale

    Object.assign(scope.style, {
      width: `${boxW}px`,
      height: `${boxH}px`,
      left: `${boxX}px`,
      top: `${boxY}px`,
    })
    }
    }

    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    container.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('wheel', onWheel)
    }
  }, [svgContent])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white">
      {/* 메인 SVG */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* 미니맵 */}
      <div
        ref={minimapRef}
        className="absolute bottom-4 right-4 w-40 h-40 border border-black bg-white shadow-md overflow-hidden"
      >
        <div className="relative w-full h-full overflow-hidden">
          <div
            className="absolute top-0left-0 origin-top-left scale-[0.025]"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
          <div
            id="scope"
            className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none"
          />
        </div>
      </div>
    </div>
  )
}