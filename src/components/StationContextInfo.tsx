type Props = {
  lineId: number
  prev: string | null
  current: string
  next: string | null
}

const lineColor: Record<number, string> = {
  1001: "#0052A4",
  1002: "#00A84D",
  1003: "#EF7C1C",
  1004: "#00A5DE",
  1005: "#996CAC",
  1006: "#CD7C2F",
  1007: "#747F00",
  1008: "#E6186C",
  1009: "#BDB092",
  1092: "#B0CE18",
  1067: "#0C8E72",
  1063: "#77C4A3",
  1075: "#F5A200",
  1077: "#D4003B",
  1065: "#0065B3"
}

export default function StationContextInfo({ lineId, prev, current, next }: Props) {
  const color = lineColor[lineId] ?? '#D9D9D9'

  return (
    <div className="w-full">
      <svg viewBox="0 0 447 112" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M319 0.5C342.783 0.5 362.872 16.3138 369.326 38H447V73H369.612C363.486 95.1983 343.147 111.5 319 111.5H128C103.853 111.5 83.5144 95.1983 77.3877 73H0V38H77.6738C84.1279 16.3138 104.217 0.500001 128 0.5H319ZM128 19.5C109.498 19.5 94.5 34.4985 94.5 53V59C94.5 77.5015 109.498 92.5 128 92.5H319C337.502 92.5 352.5 77.5015 352.5 59V53C352.5 34.4985 337.502 19.5 319 19.5H128Z" fill={color}/>
        <circle cx="129.5" cy="55.5" r="25.5" fill={color}/>
      </svg>
    </div>
  )
}