import { useEffect } from "react"
import subwayData from '@/data/subway_by_line.json' assert { type: "json" }

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

const API_KEY = process.env.NEXT_PUBLIC_SEOUL_SUBWAY_API_KEY
export default function StationPanel({ selectedStation, onClose }: Props) {
  useEffect(() => {
    const normalizedStation = selectedStation.replace(/\s+/g, '')

    const result = Object.entries(typedData).map(([line, stations]) => {
      const index = stations.findIndex(
        station => station.STATN_NM.replace(/\s+/g, '') === normalizedStation
      )

      if (index === -1) return null

      const prev = stations[index - 1]?.STATN_NM || null
      const next = stations[index + 1]?.STATN_NM || null

      return {
        line,
        prev,
        current: stations[index].STATN_NM,
        next,
      }
    }).filter(Boolean)

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
  return(
    <section className="absolute pointer-events-auto top-0 right-0 h-screen w-[40%] p-3">
      <div className="w-full h-full bg-white rounded-md text-black">
        <h1 className="font-bold">{selectedStation}역 도착 정보</h1>
      </div>
    </section>
  )
}