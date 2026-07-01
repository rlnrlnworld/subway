export type Arrival = {
  line: string
  dir: string
  dest: string
  sec: number | null
  msg: string
  trainType?: string
  isLast?: boolean
  source: 'realtime' | 'timetable'
}

export type ArrivalsResponse = {
  source: 'realtime' | 'timetable' | 'mixed' | 'none'
  arrivals: Arrival[]
  generatedAt?: string
  warning?: string
}
