type Props = {
  selectedStation: string
  onClose: () => void
}
export default function StationPanel({ selectedStation, onClose }: Props) {
  return(
    <section className="absolute pointer-events-auto top-0 right-0 h-screen w-[40%] p-3">
      <div className="w-full h-full bg-white rounded-md text-black">
        <h1 className="font-bold">{selectedStation}역 도착 정보</h1>
      </div>
    </section>
  )
}