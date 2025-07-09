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
export default function StationPanel({ selectedStation, onClose }: Props) {
  useEffect(() => {
    const matchingIds: number[] = []

    for (const line in subwayData) {
      typedData[line].forEach( station => {
        if (station.STATN_NM === selectedStation) {
          matchingIds.push(station.SUBWAY_ID)
        }
      })
    }
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