"use client"

import { useEffect, useRef } from "react"

// Inactivity auto-logout after 10 minutes of no mouse/keyboard activity on admin pages.
export default function IdleLogout({ timeoutMs = 10 * 60 * 1000 }: { timeoutMs?: number }) {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(async () => {
        try {
          await fetch("/api/admin/logout", { method: "POST" })
        } catch {}
        window.location.href = "/admin/login"
      }, timeoutMs)
    }

    const events = ["mousemove", "keydown", "click", "touchstart"] as const
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }))
    reset()

    const handleVisibility = () => {
      // If returning after long idle, proactively reset
      if (document.visibilityState === "visible") reset()
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset))
      document.removeEventListener("visibilitychange", handleVisibility)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [timeoutMs])

  return null
}