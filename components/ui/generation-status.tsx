"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { PosterStatus } from "@/lib/status"
import { motion, AnimatePresence } from "framer-motion"
import RippleLoader from "@/components/ui/ripple-loader"
import { useRouter } from "next/navigation"

// Lazily import react-loading-indicators on the client to avoid SSR vendor-chunk resolution issues
// and provide a graceful fallback if the module fails to load.
type LoadingIndicatorsModule = typeof import("react-loading-indicators")

// Full-screen overlay to show real-time poster generation status
// - Subscribes to Supabase Realtime on generated_posters by session_id
// - Shows animated loader (Riple), rotating messages, and estimated time remaining
// - Accessible: role="status", aria-live="polite"

type Props = {
  isOpen: boolean
  sessionId: string
  templateId?: string
  onClose?: () => void
}

export default function GenerationStatus({ isOpen, sessionId, templateId, onClose }: Props) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [stage, setStage] = useState("Queued")
  // UI stage follows a timed flow with approximate durations:
  // 0–5s: PREPARE, 5–10s: UPLOAD, 10–15s: SEND, 15–45s: GENERATE, 45–60s: FINALIZE, then READY
  type StageKey = "PREPARE" | "UPLOAD" | "SEND" | "GENERATE" | "FINALIZE" | "READY"
  const [uiStage, setUiStage] = useState<StageKey>("PREPARE")
  const [finalUrl, setFinalUrl] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTsRef = useRef<number>(0)
  const [loadingIndicators, setLoadingIndicators] = useState<LoadingIndicatorsModule | null>(null)
  const didConfetti = useRef(false)
  const stageTimeoutsRef = useRef<number[]>([])
  const router = useRouter()

  // Dynamically import the spinner library on the client only
  useEffect(() => {
    let mounted = true
    import("react-loading-indicators")
      .then((mod) => {
        if (mounted) setLoadingIndicators(mod)
      })
      .catch(() => {
        // Spinner library failed to load; continue without it
        if (mounted) setLoadingIndicators(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  const messages = useMemo(
    () => [
      "Applying Bingwa creativity 🔥",
      "Convincing AI to add more drip 😎",
      "Mixing fonts faster than your designer friend",
      "Balancing exposure like a pro photographer",
      "Adding a dash of bingwa vibes 💸",
      "Spreading design sauce, not rumors",
      "AI intern doing its best, be kind 😅",
      "Tuning brightness like Wednesday - payday",
      "Crafting pixels smoother than your designer",
      "Your brand’s glow-up in progress ✨",
      "Hustle loading… grabbing extra visibility",
      "Chapa kazi; AI inakuja nayo style",
    ],
    [],
  )

  // Rotate messages periodically
  useEffect(() => {
    if (!isOpen) return
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % messages.length), 2200)
    return () => clearInterval(id)
  }, [isOpen, messages.length])

  // Start elapsed timer
  useEffect(() => {
    if (!isOpen) return
    startTsRef.current = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000)), 250)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [isOpen])

  // Subscribe to realtime updates for this session
  useEffect(() => {
    if (!isOpen || !sessionId) return

    const channel = supabase
      .channel(`generated_posters_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "generated_posters", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as any
          if (row?.status) setStage(row.status)
          if (row?.image_url) {
            setFinalUrl(row.image_url)
            // New flow: when image becomes available, status should move to AWAITING_PAYMENT and overlay remains until user proceeds
            if (row?.status === PosterStatus.AWAITING_PAYMENT) {
              setStage(PosterStatus.AWAITING_PAYMENT)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, sessionId, onClose])

  // Trigger confetti once when poster is ready
  useEffect(() => {
    async function burst() {
      try {
        const confetti = (await import("canvas-confetti")).default
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#00BFFF", "#0DB02B", "#E60000", "#ffffff"],
        })
      } catch {
        // Confetti library failed to load; skip effects
      }
    }
    if (isOpen && stage === PosterStatus.AWAITING_PAYMENT && !didConfetti.current) {
      didConfetti.current = true
      burst()
      // Auto-redirect to payment page shortly after success
      setTimeout(() => {
        try {
          router.push(`/payment/${sessionId}`)
        } catch {}
      }, 1500)
    }
  }, [isOpen, stage])

  // Fetch historical durations to estimate remaining time
  useEffect(() => {
    async function fetchEstimate() {
      try {
        if (!templateId) return
        const { data, error } = await supabase
          .from("generated_posters")
          .select("created_at, time, status, template_id")
          .eq("template_id", templateId)
          .eq("status", PosterStatus.COMPLETED)
          .order("created_at", { ascending: false })
          .limit(20)
        if (error) {
          // Silent estimate query error; skip estimation
          return
        }
        const durations: number[] = []
        for (const row of data || []) {
          const start = new Date(row.created_at).getTime()
          const end = row.time ? new Date(row.time).getTime() : start
          const seconds = Math.max(0, Math.round((end - start) / 1000))
          if (seconds > 0) durations.push(seconds)
        }
        const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 12
        setEstimatedSeconds(avg)
      } catch {
        // Silent estimate error; skip estimation
      }
    }
    fetchEstimate()
  }, [templateId])

  // Timed UI stage schedule. Overrides to READY when backend indicates completion.
  useEffect(() => {
    if (!isOpen) return
    // Clear any existing timeouts
    stageTimeoutsRef.current.forEach((id) => clearTimeout(id))
    stageTimeoutsRef.current = []

    // Start staged timeline
    setUiStage("PREPARE")
    stageTimeoutsRef.current.push(window.setTimeout(() => setUiStage("UPLOAD"), 5000))
    stageTimeoutsRef.current.push(window.setTimeout(() => setUiStage("SEND"), 10000))
    stageTimeoutsRef.current.push(window.setTimeout(() => setUiStage("GENERATE"), 15000))
    stageTimeoutsRef.current.push(window.setTimeout(() => setUiStage("FINALIZE"), 45000))
    stageTimeoutsRef.current.push(window.setTimeout(() => setUiStage("READY"), 60000))

    return () => {
      stageTimeoutsRef.current.forEach((id) => clearTimeout(id))
      stageTimeoutsRef.current = []
    }
  }, [isOpen])

  // If backend reports completion, jump to READY and clear timers
  useEffect(() => {
    if (stage === PosterStatus.AWAITING_PAYMENT || finalUrl) {
      stageTimeoutsRef.current.forEach((id) => clearTimeout(id))
      stageTimeoutsRef.current = []
      setUiStage("READY")
    }
  }, [stage, finalUrl])

  const processTextMap: Record<StageKey, string> = {
    PREPARE: "Preparing your template…",
    UPLOAD: "Uploading your images…",
    SEND: "Sending to Design Studio…",
    GENERATE: "Generating poster (this takes ~30s)…",
    FINALIZE: "Finalizing and saving your poster…",
    READY: "Poster ready! Redirecting…",
  }

  if (!isOpen) return null

  // Use a 60s timeline for the staged flow
  const total = 60
  const percent = Math.min(100, Math.round((elapsed / total) * 100))
  const remaining = Math.max(0, total - elapsed)
  const showFallbackTime = remaining <= 0
  const rippleSpeed = uiStage === "GENERATE" ? 1.0 : 1.6

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-app"
    >
      {/* Pulsing blue-red glow backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-accent opacity-25 blur-3xl animate-pulse-glow" />
      </div>

      <div className="relative mx-4 w-full max-w-lg rounded-xl bg-app-elevated p-8 shadow-md">
        <div className="flex items-center justify-center">
          <RippleLoader color="#3b82f6" speed={rippleSpeed} />
        </div>

        <div className="mt-4 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={uiStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="text-sm text-accent"
            >
              {processTextMap[uiStage]}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="mt-1 text-sm text-text-secondary"
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-app-elevated" aria-valuenow={percent} role="progressbar">
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${percent}%`,
                backgroundImage:
                  "linear-gradient(90deg, #a855f7 0%, #3b82f6 50%, #ec4899 100%)",
                backgroundSize: "300% 100%",
              }}
              animate={{ backgroundPositionX: ["0%", "100%"] }}
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 2.4, ease: "linear" }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-text-secondary">
            {showFallbackTime ? "Still crafting perfection… hang tight!" : `~${Math.max(1, Math.round(remaining))}s remaining`}
          </p>
        </div>

        {finalUrl && stage === PosterStatus.AWAITING_PAYMENT && (
          <div className="mt-4 text-center animate-in fade-in-0 duration-300">
            <p className="text-base font-semibold text-text-primary">Poster generated successfully!</p>
            <p className="mt-1 text-sm text-text-secondary">Redirecting you to payment…</p>
          </div>
        )}
      </div>
    </div>
  )
}
