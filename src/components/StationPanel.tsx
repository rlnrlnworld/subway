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
    const matchingIds: number[] = []
    const normalizedStation = selectedStation.replace(/\s+/g, '')

    for (const line in subwayData) {
      typedData[line].forEach( station => {
        if (station.STATN_NM === normalizedStation) {
          matchingIds.push(station.SUBWAY_ID)
        }
      })
    }

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
    
    console.log(`${selectedStation}역의 SUBWAY_ID 목록:`, matchingIds)
  }, [selectedStation])
  return(
    <section className="absolute pointer-events-auto top-0 right-0 h-screen w-[40%] p-3">
      <div className="w-full h-full bg-white rounded-md text-black">
        <h1 className="font-bold">{selectedStation}역 도착 정보</h1>
      </div>
    </section>
  )
}