'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onStationClick: (station: string) => void
}

export default function SubwayMap({ onStationClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<HTMLDivElement>(null)
  const stationClickRef = useRef(onStationClick)
  const [svgContent, setSvgContent] = useState('')

  const transform = useRef({
    x: 0,
    y: 0,
    scale: 0.6,
  })

  // 최신 콜백 ref 유지
  useEffect(() => {
    stationClickRef.current = onStationClick
  }, [onStationClick])

  const applyTransform = () => {
    const container = containerRef.current
    const svg = container?.querySelector('svg')
    const g = svg?.querySelector('#viewport') as SVGGElement
    const { x, y, scale } = transform.current

    if (g) g.setAttribute('transform', `translate(${x},${y}) scale(${scale})`)

    const mini = minimapRef.current
    const scope = mini?.querySelector('#scope') as HTMLDivElement
    const miniSvg = mini?.querySelector('svg') as SVGSVGElement
    const miniG = miniSvg?.querySelector('#viewport') as SVGGElement

    if (mini && scope && miniSvg && miniG && container) {
      const mainW = container.offsetWidth
      const mainH = container.offsetHeight

      const zoomScale = scale
      const minimapScale = 0.025

      Object.assign(scope.style, {
        width: `${(mainW * minimapScale) / zoomScale}px`,
        height: `${(mainH * minimapScale) / zoomScale}px`,
        left: `${(-transform.current.x * minimapScale) / zoomScale}px`,
        top: `${(-transform.current.y * minimapScale) / zoomScale}px`,
      })
    }
  }

  const animateTo = (targetX: number, targetY: number, targetScale: number) => {
    const duration = 500
    const start = performance.now()
    const { x: startX, y: startY, scale: startScale } = transform.current

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

      transform.current.x = startX + (targetX - startX) * ease
      transform.current.y = startY + (targetY - startY) * ease
      transform.current.scale = startScale + (targetScale - startScale) * ease

      applyTransform()
      if (t < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }

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

    requestAnimationFrame(() => {
      const svg = container.querySelector('svg') as SVGSVGElement
      if (!svg) return

      const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number)
      if (!viewBox || viewBox.length !== 4) return

      const [, , svgWidth, svgHeight] = viewBox
      const containerWidth = container.offsetWidth
      const containerHeight = container.offsetHeight
      const scale = transform.current.scale

      transform.current.x = (containerWidth - svgWidth * scale) / 2
      transform.current.y = (containerHeight - svgHeight * scale) / 2

      applyTransform()
    })

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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const svg = container.querySelector('svg')
    if (!svg) return

    // 기존 ellipse 제거
    svg.querySelectorAll('ellipse[data-station-overlay]').forEach(el => el.remove())

    const texts = svg.querySelectorAll('text')

    texts.forEach(text => {
      const matrixRaw = text.getAttribute('transform')
      const matrixMatch = matrixRaw?.match(/matrix\([^\)]+\)/)
      const content = text.textContent?.trim()
      if (!matrixMatch || !content) return

      const hasTspan = text.querySelectorAll('tspan').length > 0

      const [a, b, c, d, x, y] = matrixMatch[0]
        .replace('matrix(', '')
        .replace(')', '')
        .split(/[\s,]+/)
        .map(Number)

      const bbox = (text as SVGGElement).getBBox()
      const rx = bbox.width / 2 * 1.5
      const ry = bbox.height / 2 * 1.5

      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
      ellipse.setAttribute('data-station-overlay', 'true')
      ellipse.setAttribute('cx', '0')
      ellipse.setAttribute('cy', '0')
      ellipse.setAttribute('rx', rx.toString())
      ellipse.setAttribute('ry', ry.toString())

      const correctedMatrix = `matrix(${a} ${b} ${c} ${d} ${x + rx / 2} ${hasTspan ? y - ry / 2 : y - ry})`
      ellipse.setAttribute('transform', correctedMatrix)

      ellipse.setAttribute('fill', 'transparent')
      ellipse.setAttribute('class', 'pointer-events-auto')
      ellipse.style.cursor = 'pointer'

      ellipse.addEventListener('click', () => {
        const containerWidth = container.offsetWidth
        const containerHeight = container.offsetHeight
        const targetScale = 0.8
        
        const viewRatio = 0.6 // 왼쪽 영역 비율
        const centerX = x + rx / 2
        const centerY = hasTspan ? y - ry / 2 : y - ry

        const targetX = (containerWidth * viewRatio) / 2 - centerX * targetScale
        const targetY = containerHeight / 2 - centerY * targetScale

        animateTo(targetX, targetY, targetScale)
        stationClickRef.current(content)
      })

      text.parentNode?.appendChild(ellipse)
    })
  }, [svgContent, containerRef.current?.innerHTML])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white">
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <div
        ref={minimapRef}
        className="absolute bottom-4 right-4 w-40 h-40 border border-black bg-white shadow-md overflow-hidden"
      >
        <div className="relative w-full h-full overflow-hidden">
          <div
            className="absolute top-0 left-0 origin-top-left scale-[0.025]"
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