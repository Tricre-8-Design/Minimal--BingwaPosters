"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { showToast } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

const friendlyPhrases = [
  "Firing up the creative engines... 🚀",
  "Mixing the perfect colors for you... 🎨",
  "Adjusting the spotlight... ✨",
  "Adding a sprinkle of magic... 🪄",
  "Almost there, making it shine... 🌟",
  "Reviewing the pixels... 🧐",
  "Wrapping it up with style... 🎀",
]

export default function ProgressPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [isLoadingPoster, setIsLoadingPoster] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [countdown, setCountdown] = useState(60)

  // Polling for session data
  useEffect(() => {
    let sessionDataPollingInterval: NodeJS.Timeout | null = null
    const MAX_SESSION_DATA_POLLING_MS = 30_000
    const SESSION_DATA_POLLING_INTERVAL = 1000
    const started = Date.now()

    const pollSessionData = () => {
      sessionDataPollingInterval = setInterval(() => {
        const data = localStorage.getItem(sessionId)
        if (data) {
          setSessionData(JSON.parse(data))
          if (sessionDataPollingInterval) clearInterval(sessionDataPollingInterval)
        } else if (Date.now() - started >= MAX_SESSION_DATA_POLLING_MS) {
          setError("Session data not found. Please start over.")
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

  // Robust poster polling
  async function waitForPoster(sessionId: string, maxMs = 65_000, interval = 2000) {
    const started = Date.now()
    while (Date.now() - started < maxMs) {
      const { data, error } = await supabase
        .from("generated_posters")
        .select("image_url")
        .eq("session_id", sessionId)
        .not("image_url", "is", null)

      if (error) throw error

      if (data && data.length > 0 && data[0].image_url) {
        return data[0].image_url
      }

      await new Promise((r) => setTimeout(r, interval))
    }
    // Don't throw error immediately appropriately let the UI handle the "taking long" state
    return null
  }

  // Polling for generated_posters.image_url
  useEffect(() => {
    if (!sessionId || !sessionData) return

    let isMounted = true

    const fetchPoster = async () => {
      setIsLoadingPoster(true)
      try {
        const url = await waitForPoster(sessionId)
        if (isMounted && url) {
          setPosterUrl(url)
          setIsLoadingPoster(false)
        } else if (isMounted && !url) {
          // If we timed out or didn't get it, we let the countdown finish handling it 
          // or we can decide to keep polling silently. 
          // For now, if wait returns null (timeout), we stay in loading state 
          // but the countdown will likely have hit 0.
        }
      } catch (err: any) {
        if (isMounted) {
          setError(`Failed to generate: ${err.message}`)
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

  // Phrases rotation
  useEffect(() => {
    if (isLoadingPoster) {
      const id = setInterval(() => {
        setPhraseIndex((prev) => (prev + 1) % friendlyPhrases.length)
      }, 3000)
      return () => clearInterval(id)
    }
  }, [isLoadingPoster])

  // Countdown timer
  useEffect(() => {
    if (!isLoadingPoster && !posterUrl) return // Don't count if error or not started really
    if (posterUrl) return // Stop if done

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isLoadingPoster, posterUrl])


  // Instant redirect when poster is ready
  useEffect(() => {
    if (posterUrl) {
      router.push(`/payment/${sessionId}`)
    }
  }, [posterUrl, router, sessionId])

  if (error) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full shadow-xl">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Something went wrong</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <Link href="/templates">
            <Button className="w-full bg-primary hover:bg-primary-hover text-white">
              Back to Templates
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-yellow-400 via-orange-300 to-yellow-500 overflow-y-auto">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none fixed">
        <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-200 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse delay-700"></div>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative z-10">
        <div className="flex flex-col items-center w-full max-w-xl text-center my-auto">

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 md:mb-8 relative"
          >
            <div className="absolute inset-0 bg-white/50 blur-xl rounded-full scale-110"></div>
            <Image
              src="/logo.svg"
              alt="Bingwa Logo"
              width={120}
              height={120}
              className="relative z-10 w-24 h-24 md:w-40 md:h-40 drop-shadow-md animate-bounce-slow"
              priority
            />
          </motion.div>

          {/* Status Text */}
          <AnimatePresence mode="wait">
            {posterUrl ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white"
              >
                <h1 className="text-2xl md:text-4xl font-bold mb-2 text-shadow-sm">Poster Ready!</h1>
                <p className="text-base md:text-lg opacity-90">Redirecting you now...</p>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <motion.div
                  key="loading-text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-6 md:mb-8 w-full"
                >
                  <h1 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-4 drop-shadow-md font-space">
                    {countdown > 0 ? "Creating your design..." : "Finishing up..."}
                  </h1>

                  <div className="h-12 flex items-center justify-center overflow-hidden w-full px-4">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={phraseIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="text-white text-base md:text-xl font-medium font-inter"
                      >
                        {countdown > 0 ? friendlyPhrases[phraseIndex] : "Finalizing the poster, redirecting..."}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Countdown Circular Progress */}
                <div className="relative mb-6 md:mb-8 transform scale-90 md:scale-100 transition-transform">
                  <svg className="w-32 h-32 md:w-40 md:h-40 transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="44%"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-white/30"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="44%"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      pathLength={100}
                      strokeDasharray={100}
                      strokeDashoffset={100 * ((60 - countdown) / 60)}
                      className="text-white transition-all duration-1000 ease-linear"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl md:text-4xl font-bold text-white font-mono">{countdown}</span>
                    <span className="text-[10px] md:text-xs text-white/80 uppercase tracking-widest mt-1">Seconds</span>
                  </div>
                </div>

                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 md:p-4 max-w-xs mx-auto text-white text-xs md:text-sm font-medium border border-white/20">
                  <p>Please don't close this page.<br />Good things take time! ✨</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-3%); }
          50% { transform: translateY(3%); }
        }
        .text-shadow-sm {
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .font-space {
          font-family: var(--font-space), monospace;
        }
        .font-inter {
            font-family: var(--font-inter), sans-serif;
        }
      `}</style>
    </div>
  )
}
