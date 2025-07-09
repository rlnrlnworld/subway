'use client'

import { useEffect, useRef, useState } from 'react'

export default function SubwayMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState('')

  const applyTransform = () => {
    const container = containerRef.current
    const svg = container?.querySelector('svg')
    const g = svg?.querySelector('#viewport') as SVGGElement
    const { x, y, scale } = transform.current

    if (g)
      g.setAttribute('transform', `translate(${x},${y}) scale(${scale})`)

    const mini = minimapRef.current
    const scope = mini?.querySelector('#scope') as HTMLDivElement
    const miniSvg = mini?.querySelector('svg') as SVGSVGElement
    const miniG = miniSvg?.querySelector('#viewport') as SVGGElement

    if (mini && scope && miniSvg && miniG && container) {
      const mainW = container.offsetWidth
      const mainH = container.offsetHeight

      const zoomScale = scale
      const minimapScale = 0.025

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

  const transform = useRef({
    x: 0,
    y: 0,
    scale: 0.6,
  })

  const animateTo = (targetX: number, targetY: number, targetScale: number) => {
    const duration = 500 // milliseconds
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
      const container = containerRef.current
      const svg = container?.querySelector('svg') as SVGSVGElement

      if (!container || !svg) return

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
      ellipse.setAttribute('cx', '0')
      ellipse.setAttribute('cy', '0')
      ellipse.setAttribute('rx', rx.toString())
      ellipse.setAttribute('ry', ry.toString())

      const correctedMatrix = `matrix(${a} ${b} ${c} ${d} ${x + rx/2} ${hasTspan ? y-ry/2 : y-ry})`
      ellipse.setAttribute('transform', correctedMatrix)

      ellipse.setAttribute('fill', 'transparent')
      ellipse.setAttribute('class', 'pointer-events-auto')
      ellipse.style.cursor = 'pointer'
      ellipse.addEventListener('click', () => {
        console.log(`${content} clicked (tspan: ${hasTspan})`)

        const container = containerRef.current
        if (!container) return

        const containerWidth = container.offsetWidth
        const containerHeight = container.offsetHeight

        const targetScale = 0.8

        const centerX = x + rx / 2
        const centerY = hasTspan ? y - ry / 2 : y - ry

        const targetX = containerWidth / 2 - centerX * targetScale
        const targetY = containerHeight / 2 - centerY * targetScale

        animateTo(targetX, targetY, targetScale)
      })

      text.parentNode?.appendChild(ellipse)
    })
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