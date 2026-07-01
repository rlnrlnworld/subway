export type Station = {
  id: string
  name: string
  line: string
  order: number
  x: number
  y: number
  pathUp: string | null
  pathDown: string | null
}

export type Line = {
  name: string
  color: string
  label: string
  startX: number
  startY: number
}

export type Pt = { x: number; y: number }
export type Seg = { a: Pt; b: Pt }

export type LabelLayout = {
  x: number
  y: number
  textAnchor: 'start' | 'middle' | 'end'
  baseline: 'alphabetic' | 'central' | 'hanging'
  rotation?: number
}

export type DotGroup = {
  key: string
  x: number
  y: number
  name: string
  lines: string[]
  stations: Station[]
}

export type PillOrientation = 'horizontal' | 'vertical' | 'diag-up' | 'diag-down'

export type Side = 'top' | 'bottom' | 'left' | 'right'

export type LabelDir = 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br'

export type SelectedDot = {
  key: string
  name: string
  svgX: number
  svgY: number
  lines: string[]
}
