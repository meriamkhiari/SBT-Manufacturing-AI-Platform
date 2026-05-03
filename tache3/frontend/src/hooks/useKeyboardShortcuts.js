import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

/**
 * Raccourcis clavier globaux :
 *   Ctrl+K  → Ouvre la palette de commandes
 *   Ctrl+H  → Accueil
 *   Ctrl+M  → Carte
 *   Ctrl+G  → Graphe
 *   Ctrl+P  → Marketing (Pitchs)
 *   Escape  → Fermer modals (géré par les composants eux-mêmes)
 */
export function useKeyboardShortcuts() {
  const navigate     = useNavigate()
  const openPalette  = useStore(s => s.openPalette)
  const paletteOpen  = useStore(s => s.commandPaletteOpen)

  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+K : ouvre/ferme la palette (même depuis un champ texte)
      if (ctrl && e.key === 'k') {
        e.preventDefault()
        if (!paletteOpen) openPalette()
        return
      }

      // Ignorer les autres raccourcis si focus dans un champ de saisie
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (document.activeElement?.contentEditable === 'true') return

      if (ctrl && e.key === 'h') { e.preventDefault(); navigate('/') }
      if (ctrl && e.key === 'm') { e.preventDefault(); navigate('/map') }
      if (ctrl && e.key === 'g') { e.preventDefault(); navigate('/graph') }
      if (ctrl && e.key === 'p') { e.preventDefault(); navigate('/marketing') }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, openPalette, paletteOpen])
}
