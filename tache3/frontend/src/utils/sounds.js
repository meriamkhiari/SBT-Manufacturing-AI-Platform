/**
 * sounds.js — Utilitaire audio SBT
 *
 * Règle d'or des navigateurs : un AudioContext doit être créé (ou resumé)
 * directement depuis un geste utilisateur, sinon il reste en état "suspended"
 * et ne joue rien.
 *
 * Solution : on crée le contexte une seule fois lors du premier clic
 * sur "Activer le son", puis on le réutilise pour tous les sons suivants.
 */

let _ctx = null

/** Récupère (ou crée) le contexte audio — appeler depuis un geste utilisateur */
export function unlockAudio() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume()
  }
  return _ctx
}

/** Joue une note simple */
function playNote(ctx, freq, startTime, duration, volume = 0.18, type = 'sine') {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(volume, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

/**
 * Son de fin d'agent — accord Do-Mi-Sol ascendant (victoire)
 * Joué quand un agent se termine avec succès
 */
export function playSoundDone() {
  try {
    const ctx = _ctx
    if (!ctx || ctx.state === 'suspended') return
    const t = ctx.currentTime
    playNote(ctx, 523.25, t,        0.18, 0.15) // Do
    playNote(ctx, 659.25, t + 0.14, 0.18, 0.15) // Mi
    playNote(ctx, 783.99, t + 0.28, 0.30, 0.18) // Sol (tenu)
  } catch { /* silencieux si erreur */ }
}

/**
 * Son de confirmation — court "ding" positif
 * Utilisé pour : copie, téléchargement, action réussie
 */
export function playSoundClick() {
  try {
    const ctx = _ctx
    if (!ctx || ctx.state === 'suspended') return
    const t = ctx.currentTime
    playNote(ctx, 880, t, 0.12, 0.12, 'sine')
  } catch {}
}

/**
 * Son de notification — deux bips doux
 * Utilisé pour : nouveau message chatbot, alerte douce
 */
export function playSoundNotif() {
  try {
    const ctx = _ctx
    if (!ctx || ctx.state === 'suspended') return
    const t = ctx.currentTime
    playNote(ctx, 660, t,        0.1, 0.10)
    playNote(ctx, 880, t + 0.15, 0.15, 0.10)
  } catch {}
}

/**
 * Son d'erreur — descente grave
 */
export function playSoundError() {
  try {
    const ctx = _ctx
    if (!ctx || ctx.state === 'suspended') return
    const t = ctx.currentTime
    playNote(ctx, 330, t,        0.12, 0.12, 'sawtooth')
    playNote(ctx, 220, t + 0.15, 0.20, 0.10, 'sawtooth')
  } catch {}
}

/**
 * Son de test — joué quand l'utilisateur active le son
 * Doit être appelé DIRECTEMENT dans le handler onClick (geste utilisateur)
 */
export function playSoundTest() {
  try {
    const ctx = unlockAudio() // déverrouille + récupère contexte
    const t = ctx.currentTime
    playNote(ctx, 440, t,        0.10, 0.12)
    playNote(ctx, 554, t + 0.10, 0.10, 0.12)
    playNote(ctx, 659, t + 0.20, 0.20, 0.15)
  } catch {}
}
