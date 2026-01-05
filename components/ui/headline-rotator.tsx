"use client"

import { useEffect, useMemo, useRef, useState } from "react"

/**
 * HeadlineRotator
 * Rotates through provided phrases with a smooth fade/slide animation.
 * Inputs: phrases (string[]), intervalMs (number), className (string)
 * Output: an animated <h1> that transitions between phrases.
 * Side effects: sets an interval timer to update text; respects reduced motion.
 */
export function HeadlineRotator({
  phrases,
  intervalMs = 4000,
  className = "",
  easing = "cubic-bezier(0.2, 0.8, 0.2, 1)",
}: {
  phrases: string[]
  intervalMs?: number
  className?: string
  easing?: string
}) {
  const safePhrases = useMemo(() => (Array.isArray(phrases) && phrases.length > 0 ? phrases : [""]), [phrases])
  const [index, setIndex] = useState(0)
  const reduceMotionRef = useRef(false)

  useEffect(() => {
    // Respect user motion preferences: don't auto-rotate when reduced motion is requested
    if (typeof window !== "undefined") {
      reduceMotionRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    }

    if (reduceMotionRef.current || safePhrases.length <= 1) return

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % safePhrases.length)
    }, intervalMs)

    return () => clearInterval(id)
  }, [safePhrases.length, intervalMs])

  // Keep animation timing aligned with the interval
  const animationStyle: React.CSSProperties = {
    animationDuration: `${intervalMs}ms`,
    animationTimingFunction: easing,
  }

  return (
    <h1 className={`font-bold ${className}`.trim()}>
      {/* SR-only announcement to keep screen readers informed without visual clutter */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {safePhrases[index]}
      </span>
      {/* Visual animation container; height set to reduce layout shift across different phrase lengths */}
      <span className="relative block h-[1.2em]" aria-hidden="true">
        <span key={index} className="absolute inset-0 animate-rotate-fade" style={animationStyle}>
          {safePhrases[index]}
        </span>
      </span>
    </h1>
  )
}

export default HeadlineRotator