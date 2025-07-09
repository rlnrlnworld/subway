import { lineMeta } from "@/data/lineMeta"
import { Triangle } from "lucide-react"

type Props = {
  lineId: number
  prev: string | null
  current: string
  next: string | null
}


export default function StationContextInfo({ lineId, prev, current, next }: Props) {
  const meta = lineMeta[lineId]
  const color = meta?.lineColor ?? "#D9D9D9"
  const number = meta?.lineNumber ?? ""
  const fontSize =
  number.length === 1
    ? 36
    : number.length <= 2
    ? 24
    : number.length <= 4
    ? 14
    : number.length <= 6
    ? 13
    : 11

  const currentFontSize =
    current.length === 1
      ? 38
      : current.length === 2
      ? 32
      : current.length <= 4
      ? 28
      : current.length <= 6
      ? 23
      : 20

  return (
    <div className="w-full relative">
      <svg viewBox="0 0 447 112" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M319 0.5C342.783 0.5 362.872 16.3138 369.326 38H447V73H369.612C363.486 95.1983 343.147 111.5 319 111.5H128C103.853 111.5 83.5144 95.1983 77.3877 73H0V38H77.6738C84.1279 16.3138 104.217 0.500001 128 0.5H319ZM128 19.5C109.498 19.5 94.5 34.4985 94.5 53V59C94.5 77.5015 109.498 92.5 128 92.5H319C337.502 92.5 352.5 77.5015 352.5 59V53C352.5 34.4985 337.502 19.5 319 19.5H128Z" fill={color}/>
        <circle cx="129.5" cy="55.5" r="25.5" fill={color}/>
        <text
          x="129.5"
          y="55.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={fontSize}
          fontWeight="bold"
        >
          {number}
        </text>
        <text
          x="235"
          y="55.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="black"
          fontSize={currentFontSize}
          fontWeight="bold"
        >
          {current}
        </text>
      </svg>


      <div className="absolute top-1/2 -translate-y-1/2 left-3 flex items-center gap-1 font-bold text-white opacity-90">
        <Triangle size={10} fill="#fff" className="-rotate-90" />
        <span className="max-w-[60px] truncate inline-block">{prev}</span>
      </div>

      <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-1 font-bold text-white opacity-90">
        <span className="max-w-[60px] truncate inline-block">{next}</span>
        <Triangle size={10} fill="#fff" className="rotate-90" />
      </div>
    </div>
  )
}