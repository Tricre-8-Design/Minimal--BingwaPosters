"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Download, CheckCircle, XCircle, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { showToast } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import RippleLoader from "@/components/ui/ripple-loader"
// Removed Paystack; flow now redirects to M-Pesa payment page

const rotatingPhrases = [
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
]

export default function ProgressPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [isLoadingPoster, setIsLoadingPoster] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  // Payment verification handled in dedicated payment page via M-Pesa
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  // Timed stage flow: 0–5s PREPARE, 5–10s UPLOAD, 10–15s SEND, 15–45s GENERATE, 45–60s FINALIZE, then READY
  type StageKey = "PREPARE" | "UPLOAD" | "SEND" | "GENERATE" | "FINALIZE" | "READY"
  const [uiStage, setUiStage] = useState<StageKey>("PREPARE")
  const didConfetti = useRef(false)
  const stageTimeoutsRef = useRef<number[]>([])

  // Polling for session data from localStorage (Updated to time-based polling)
  useEffect(() => {
    let sessionDataPollingInterval: NodeJS.Timeout | null = null
    const MAX_SESSION_DATA_POLLING_MS = 30_000 // Max 30 seconds for session data
    const SESSION_DATA_POLLING_INTERVAL = 1000 // Check every 1 second
    const started = Date.now()

    const pollSessionData = () => {
      sessionDataPollingInterval = setInterval(() => {
        const data = localStorage.getItem(sessionId)
        if (data) {
          setSessionData(JSON.parse(data))
          if (sessionDataPollingInterval) clearInterval(sessionDataPollingInterval)
        } else if (Date.now() - started >= MAX_SESSION_DATA_POLLING_MS) {
          setError("Session data not found after multiple attempts. Please start over.")
          setIsLoadingPoster(false)
          if (sessionDataPollingInterval) clearInterval(sessionDataPollingInterval)
        }
      }, SESSION_DATA_POLLING_INTERVAL)
    }

    if (!sessionData) {
      pollSessionData()
    }

    return () => {
      if (sessionDataPollingInterval) clearInterval(sessionDataPollingInterval)
    }
  }, [sessionId, sessionData])

  // New function for robust poster polling (Updated to handle multiple rows)
  async function waitForPoster(sessionId: string, maxMs = 45_000, interval = 2500) {
    const started = Date.now()
    while (Date.now() - started < maxMs) {
      const { data, error } = await supabase
        .from("generated_posters")
        .select("image_url")
        .eq("session_id", sessionId)
        .not("image_url", "is", null)

      if (error) throw error

      // Check if data is an array and has at least one item with image_url
      if (data && data.length > 0 && data[0].image_url) {
        return data[0].image_url
      }

      await new Promise((r) => setTimeout(r, interval))
    }
    throw new Error("Timed out waiting for poster")
  }

  // Polling for generated_posters.image_url (updated logic)
  useEffect(() => {
    if (!sessionId || !sessionData) return

    let isMounted = true

    const fetchPoster = async () => {
      setIsLoadingPoster(true)
      try {
        const url = await waitForPoster(sessionId)
        if (isMounted) {
          setPosterUrl(url)
          setIsLoadingPoster(false)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(`Failed to generate poster: ${err.message}`)
          setIsLoadingPoster(false)
        }
      }
    }

    if (!posterUrl && sessionData) {
      fetchPoster()
    }

    return () => {
      isMounted = false
    }
  }, [sessionId, sessionData, posterUrl])

  // Animated rotating phrases effect
  useEffect(() => {
    if (isLoadingPoster || isVerifyingPayment) {
      const id = setInterval(() => {
        setPhraseIndex((prev) => (prev + 1) % rotatingPhrases.length)
      }, 2300)
      return () => clearInterval(id)
    }
  }, [isLoadingPoster, isVerifyingPayment])

  // Start elapsed timer for progress mapping
  useEffect(() => {
    if (!(isLoadingPoster || isVerifyingPayment)) return
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250)
    return () => clearInterval(timer)
  }, [isLoadingPoster, isVerifyingPayment])

  // Fetch estimates from historical completions of same template
  useEffect(() => {
    async function fetchEstimate() {
      try {
        if (!sessionData?.templateId) return
        const { data, error } = await supabase
          .from("generated_posters")
          .select("created_at, time, status, template_id")
          .eq("template_id", sessionData.templateId)
          .eq("status", "COMPLETED")
          .order("created_at", { ascending: false })
          .limit(20)
        if (error) {
          setEstimatedSeconds(12)
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
      } catch (e) {
        setEstimatedSeconds(12)
      }
    }
    fetchEstimate()
  }, [sessionData?.templateId])

  // Timed stage schedule; jumps to READY when poster is available
  useEffect(() => {
    // Clear any existing timeouts
    stageTimeoutsRef.current.forEach((id) => clearTimeout(id))
    stageTimeoutsRef.current = []

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
  }, [])

  useEffect(() => {
    if (posterUrl) {
      stageTimeoutsRef.current.forEach((id) => clearTimeout(id))
      stageTimeoutsRef.current = []
      setUiStage("READY")
    }
  }, [posterUrl])

  // Confetti and redirect on ready
  useEffect(() => {
    async function burst() {
      try {
        const confetti = (await import("canvas-confetti")).default
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      } catch (e) {
        // Silent confetti failure
      }
    }
    if (posterUrl && !didConfetti.current) {
      didConfetti.current = true
      burst()
      setTimeout(() => router.push(`/payment/${sessionId}`), 1500)
    }
  }, [posterUrl, router, sessionId])

  // Removed Paystack payment polling. M-Pesa verification happens on /payment page.

  const processTextMap: Record<StageKey, string> = {
    PREPARE: "Preparing your template…",
    UPLOAD: "Uploading your images…",
    SEND: "Sending to Design Studio…",
    GENERATE: "Generating poster (this takes ~30s)…",
    FINALIZE: "Finalizing and saving your poster…",
    READY: "Poster ready! Redirecting…",
  }

  const downloadPoster = useCallback(() => {
    if (posterUrl) {
      const link = document.createElement("a")
      link.href = posterUrl
      link.download = `bingwa_poster_${sessionId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast("Poster downloaded successfully!", "success")
    } else {
      showToast("Poster not available for download yet.", "error")
    }
  }, [posterUrl, sessionId])

  const handlePay = () => {
    if (!sessionData || !sessionData.price) {
      showToast("Missing payment details. Please go back and try again.", "error")
      return
    }
    // Redirect to the dedicated M-Pesa payment page where phone input and STK push are handled
    router.push(`/payment/${sessionId}`)
  }

  if (error) {
    return (
<div className="min-h-screen site-gradient-bg flex items-center justify-center section-fade-in transition-smooth">
        <Card className="glass p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-space">Error</h2>
          <p className="text-blue-200 mb-4 font-inter">{error}</p>
          <Link href="/templates">
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500 btn-interactive neon-purple">
              Back to Templates
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
<div className="min-h-screen site-gradient-bg relative overflow-hidden section-fade-in scroll-fade-in transition-smooth">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href={`/create/${sessionData?.templateId}`}>
              <Button
                size="icon"
                className="glass btn-interactive text-white hover:neon-blue transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center mx-auto mb-4 neon-purple">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-white font-bold text-xl font-space">Poster Progress</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-4 md:px-6 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
        <Card className="glass p-8 w-full max-w-2xl text-center">
          {isLoadingPoster || isVerifyingPayment || !sessionData ? (
            <div className="flex flex-col items-center justify-center h-96" aria-live="polite">
              {/* Ripple loader that speeds up during processing */}
              <RippleLoader color="#a855f7" speed={uiStage === "GENERATE" ? 1.0 : 1.6} />

              {/* Main process step */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={uiStage}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="mt-4 text-base text-white font-space"
                >
                  {processTextMap[uiStage]}
                </motion.p>
              </AnimatePresence>

              {/* Rotating humorous subtext */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={phraseIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="mt-1 text-sm text-blue-200 font-inter"
                >
                  {rotatingPhrases[phraseIndex]}
                </motion.p>
              </AnimatePresence>

              {/* Animated gradient progress bar and countdown */}
              <div className="mt-5 w-full max-w-md">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round(((elapsed) / 60) * 100))}%`,
                      backgroundImage:
                        "linear-gradient(90deg, #a855f7 0%, #3b82f6 50%, #ec4899 100%)",
                      backgroundSize: "300% 100%",
                    }}
                    animate={{ backgroundPositionX: ["0%", "100%"] }}
                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 2.4, ease: "linear" }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-white/70">
                  {Math.max(0, 60 - elapsed) > 0
                    ? `~${Math.max(1, Math.round(60 - elapsed))}s remaining`
                    : "Still crafting perfection… hang tight!"}
                </p>
              </div>
            </div>
          ) : posterUrl ? (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 neon-green animate-pulse">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 font-space">Poster Ready!</h2>
              <p className="text-blue-200 font-inter">Your custom poster is ready for download.</p>

              <div className="relative w-full max-w-md mx-auto aspect-[3/4] rounded-lg overflow-hidden shadow-lg border border-white/20">
                <Image
                  src={posterUrl || "/placeholder.svg"}
                  alt="Generated Poster"
                  layout="fill"
                  objectFit="contain"
                  className="rounded-lg"
                />
              </div>

              <Button
                onClick={handlePay}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-4 text-lg font-semibold font-space"
              >
                <Download className="w-5 h-5 mr-2" />
                Pay KSh {sessionData?.price || "0"} & Download
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center mx-auto neon-purple">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 font-space">Poster Generation Failed</h2>
              <p className="text-blue-200 font-inter">
                We encountered an issue generating your poster. Please try again or contact support.
              </p>
              <Link href={`/create/${sessionData?.templateId}`}>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 btn-interactive neon-purple py-3 font-space">
                  Try Again
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
