import { create } from 'zustand'
import type { SelectedDot } from '@/components/subway/types'

type MapState = {
  selectedDot: SelectedDot | null
  selectedLine: string | null
  panelOpen: boolean
  selectDot: (dot: SelectedDot) => void
  clearDot: () => void
  selectLine: (name: string) => void
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
}

export const useMapStore = create<MapState>((set) => ({
  selectedDot: null,
  selectedLine: null,
  panelOpen: false,
  selectDot: (dot) =>
    set((s) => ({
      selectedDot: dot,
      selectedLine:
        s.selectedLine && dot.lines.includes(s.selectedLine)
          ? s.selectedLine
          : dot.lines[0] ?? null,
    })),
  clearDot: () =>
    set({ selectedDot: null, selectedLine: null, panelOpen: false }),
  selectLine: (name) => set({ selectedLine: name }),
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
}))
