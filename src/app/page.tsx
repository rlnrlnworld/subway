import SubwayMap from '@/components/SubwayMap'

export default function Home() {
  return (
    <main className="min-h-screen min-w-[640px] bg-white">
      <div className="w-screen h-screen min-w-[640px] min-h-[480px] flex items-center justify-center p-4">
        <SubwayMap />
      </div>
    </main>
  )
}
