import { create } from 'zustand'
import type { SelectedDot } from '@/components/subway/types'

type MapState = {
  selectedDot: SelectedDot | null
  panelOpen: boolean
  selectDot: (dot: SelectedDot) => void
  clearDot: () => void
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
}

export const useMapStore = create<MapState>((set) => ({
  selectedDot: null,
  panelOpen: false,
  selectDot: (dot) => set({ selectedDot: dot }),
  clearDot: () => set({ selectedDot: null, panelOpen: false }),
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
}))
