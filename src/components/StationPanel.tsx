import { useEffect, useState } from "react"
import subwayData from '@/data/subway_by_line.json' assert { type: "json" }
import StationContextInfo from "./StationContextInfo"

type StationInfo = {
  SUBWAY_ID: number
  STATN_ID: number
  STATN_NM: string
}

type SubwayData = {
  [lineName: string]: StationInfo[]
}

const typedData = subwayData as SubwayData

type Props = {
  selectedStation: string
  onClose: () => void
}
type ContextInfo = {
  line: string
  lineId: number
  prev: string | null
  current: string
  next: string | null
}

const API_KEY = process.env.NEXT_PUBLIC_SEOUL_SUBWAY_API_KEY
export default function StationPanel({ selectedStation, onClose }: Props) {
  const [contextInfos, setContextInfos] = useState<ContextInfo[]>([])
  const [selectedLine, setSelectedLine] = useState<string | null>(null)

  useEffect(() => {
    const normalizedStation = selectedStation.replace(/\s+/g, '')

    const result = Object.entries(typedData).map(([line, stations]) => {
      const index = stations.findIndex(
        station => station.STATN_NM.replace(/\s+/g, '') === normalizedStation
      )

      if (index === -1) return null

      const station = stations[index]

      return {
        line,
        lineId: station.SUBWAY_ID,
        prev: stations[index - 1]?.STATN_NM || null,
        current: station.STATN_NM,
        next: stations[index + 1]?.STATN_NM || null,
      }
    }).filter(Boolean) as ContextInfo[]

    setContextInfos(result)
    setSelectedLine(result[0]?.line ?? null)

    console.log(`[${selectedStation}] 전후역 정보 ↓`)
    console.table(result)

    const fetchArrivalData = async () => {
      try {
        const res = await fetch(
          `http://swopenapi.seoul.go.kr/api/subway/${API_KEY}/json/realtimeStationArrival/1/5/${encodeURIComponent(normalizedStation)}`
        )

        const data = await res.json()
        console.log(`[${selectedStation}] 실시간 도착 정보 ↓`)
        console.log(data)
      } catch (err) {
        console.error('🚨 실시간 정보 요청 실패:', err)
      }
    }

    fetchArrivalData()
    
  }, [selectedStation])

  const selectedInfo = contextInfos.find(info => info.line === selectedLine)
  
  return(
    <section className="absolute pointer-events-auto top-0 right-0 h-screen w-[40%] p-3">
      <div className="w-full h-full bg-white rounded-md text-black">
        <h1 className="font-bold">{selectedStation}역 도착 정보</h1>
        {selectedInfo && (
          <StationContextInfo
            lineId={selectedInfo.lineId}
            prev={selectedInfo.prev}
            current={selectedInfo.current}
            next={selectedInfo.next}
          />
        )}
      </div>
    </section>
  )
}