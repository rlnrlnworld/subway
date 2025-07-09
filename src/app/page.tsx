"use client"

import StationPanel from "@/components/StationPanel";
import SubwayMap from "@/components/SubwayMap";
import { useState } from "react";

export default function Home() {
  const [selectedStation, setSelectedStation] = useState<string | null>(null)

  return (
    <div className="h-screen w-full bg-white">
      <SubwayMap 
        onStationClick={(station) => {
          setSelectedStation(null)
          setTimeout(() => setSelectedStation(station), 0)
        }}
      />
      {selectedStation && (
        <div className="pointer-events-none absolute top-0 left-0 w-full h-full">
          <StationPanel
            selectedStation={selectedStation}
            onClose={() => setSelectedStation(null)}
          />
        </div>
      )}
    </div>
  );
}
