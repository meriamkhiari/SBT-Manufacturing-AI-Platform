import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({

      // ── Thème ──────────────────────────────────────────────────────────────
      isDark: false,
      toggleTheme: () => set(s => ({ isDark: !s.isDark })),

      // ── Mode compact ───────────────────────────────────────────────────────
      isCompact: false,
      toggleCompact: () => set(s => ({ isCompact: !s.isCompact })),

      // ── Notifications sonores ──────────────────────────────────────────────
      soundEnabled: false,
      toggleSound: () => set(s => ({ soundEnabled: !s.soundEnabled })),

      // ── Tracking session (badge "Nouveau") ────────────────────────────────
      lastSessionAt: null,
      markSession: () => set({ lastSessionAt: Date.now() }),

      // ── Contexte géographique ──────────────────────────────────────────────
      selectedCountry: null,
      selectedSector:  'câblage électrique industriel',
      setCountry:   (country) => set({ selectedCountry: country }),
      setSector:    (sector)  => set({ selectedSector: sector }),
      clearCountry: ()        => set({ selectedCountry: null }),

      // ── Statut des agents (mis à jour par SSE) ─────────────────────────────
      agentStatus: {
        searcher:  { running: false, message: 'Prêt', progress: 0 },
        scrapper:  { running: false, message: 'Prêt', progress: 0 },
        marketing: { running: false, message: 'Prêt', progress: 0 },
      },
      setAgentStatus: (status) => set({ agentStatus: status }),

      get isPipelineRunning() {
        return Object.values(get().agentStatus).some(a => a?.running)
      },

      // ── Favoris ────────────────────────────────────────────────────────────
      // Stocké comme tableau sérialisable, converti en Set à l'usage
      _favoritesArr: [],

      get favorites() {
        return new Set(get()._favoritesArr)
      },

      toggleFavorite: (name) => set(s => {
        const arr = s._favoritesArr
        const has = arr.includes(name)
        return { _favoritesArr: has ? arr.filter(n => n !== name) : [...arr, name] }
      }),

      clearFavorites: () => set({ _favoritesArr: [] }),

      // ── Comparaison ────────────────────────────────────────────────────────
      compareList: [],  // max 2 entreprises
      toggleCompare: (company) => set(s => {
        const list = s.compareList
        const has  = list.some(c => c.name === company.name)
        if (has)      return { compareList: list.filter(c => c.name !== company.name) }
        if (list.length >= 2) return { compareList: [list[1], company] }
        return { compareList: [...list, company] }
      }),
      clearCompare: () => set({ compareList: [] }),

      // ── Command Palette ────────────────────────────────────────────────────
      commandPaletteOpen: false,
      openPalette:  () => set({ commandPaletteOpen: true }),
      closePalette: () => set({ commandPaletteOpen: false }),

      // ── Onboarding Tour ────────────────────────────────────────────────────
      hasSeenTour:  false,
      markTourSeen: () => set({ hasSeenTour: true }),

    }),
    {
      name: 'sbt-store',
      partialize: (s) => ({
        isDark:         s.isDark,
        isCompact:      s.isCompact,
        soundEnabled:   s.soundEnabled,
        selectedSector: s.selectedSector,
        _favoritesArr:  s._favoritesArr,
        hasSeenTour:    s.hasSeenTour,
        lastSessionAt:  s.lastSessionAt,
      }),
    },
  ),
)

export default useStore
