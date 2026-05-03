import { useEffect, useRef, useState } from 'react'

/**
 * Smoothly count up from 0 to `value` when the component first appears.
 * Pure JS, no dependencies. Re-animates if `value` changes.
 */
export default function AnimatedNumber({ value, duration = 900, format = (v) => Math.round(v) }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const target = Number(value) || 0
    if (target === 0) { setDisplay(0); return }
    const start = performance.now()
    const from  = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (target - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <>{format(display)}</>
}
