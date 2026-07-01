'use client'
import { useEffect, useState } from 'react'
import { useTransformEffect } from 'react-zoom-pan-pinch'
import { activeLines, activeStationsByLine, viewBox } from './data'

export function Minimap() {
  const [tf, setTf] = useState({ x: 0, y: 0, scale: 1 })
  const [size, setSize] = useState({ w: 0, h: 0 })

  useTransformEffect(({ state }) => {
    setTf({ x: state.positionX, y: state.positionY, scale: state.scale })
  })

  useEffect(() => {
    const el = document.querySelector('.react-transform-wrapper') as HTMLElement | null
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [])

  if (size.w === 0 || size.h === 0) return null

  const MW = 180
  const MH = Math.round(MW * size.h / size.w)
  const m = MW / size.w

  const scopeLeft = -tf.x * m / tf.scale
  const scopeTop = -tf.y * m / tf.scale
  const scopeW = MW / tf.scale
  const scopeH = MH / tf.scale

  const visible = tf.scale > 1.01

  return (
    <div
      className={`fixed bottom-4 right-4 bg-white/95 border border-gray-300 rounded-md shadow-lg overflow-hidden pointer-events-none transition-all duration-200 ease-out ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'
      }`}
      style={{ width: MW, height: MH, transformOrigin: 'bottom right' }}
    >
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full block"
      >
        {activeLines.map(line => (
          <g key={line.name} stroke={line.color} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {(activeStationsByLine.get(line.name) ?? []).flatMap(s => {
              const paths = []
              if (s.pathUp) paths.push(<path key={`${s.id}-up`} d={s.pathUp} />)
              if (s.pathDown) paths.push(<path key={`${s.id}-down`} d={s.pathDown} />)
              return paths
            })}
          </g>
        ))}
      </svg>
      <div
        className="absolute border-2 border-red-500 bg-red-500/15"
        style={{ left: scopeLeft, top: scopeTop, width: scopeW, height: scopeH }}
      />
    </div>
  )
}
