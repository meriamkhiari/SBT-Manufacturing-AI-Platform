import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme
      darkMode: false,
      toggleDarkMode: () => {
        const newMode = !get().darkMode
        set({ darkMode: newMode })
        document.documentElement.classList.toggle('dark', newMode)
      },

      // Compact mode
      compactMode: false,
      toggleCompactMode: () => set({ compactMode: !get().compactMode }),

      // Sound
      soundEnabled: true,
      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),

      // Onboarding
      hasSeenOnboarding: false,
      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      // System status
      allSystemsOnline: false,
      setAllSystemsOnline: (val) => set({ allSystemsOnline: val }),

      // Play sound effect
      playSound: (type = 'success') => {
        if (!get().soundEnabled) return
        const audio = new Audio(`/sounds/${type}.mp3`)
        audio.volume = 0.3
        audio.play().catch(() => {})
      }
    }),
    {
      name: 'integration-portal-storage',
      partialize: (state) => ({
        darkMode: state.darkMode,
        compactMode: state.compactMode,
        soundEnabled: state.soundEnabled,
        hasSeenOnboarding: state.hasSeenOnboarding
      })
    }
  )
)
