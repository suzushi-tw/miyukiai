import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NsfwStore {
  showNsfwContent: boolean
  toggleNsfwVisibility: () => void
  setNsfwVisibility: (show: boolean) => void
}

export const useNsfwStore = create<NsfwStore>()(
  persist(
    (set) => ({
      showNsfwContent: false,
      toggleNsfwVisibility: () => set((state) => ({ showNsfwContent: !state.showNsfwContent })),
      setNsfwVisibility: (show: boolean) => set({ showNsfwContent: show }),
    }),
    {
      name: 'nsfw-settings', // localStorage key
    }
  )
)