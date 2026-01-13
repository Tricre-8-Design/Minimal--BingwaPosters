"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"

type Props = {
  isOpen: boolean
  sessionId: string
  templateId?: string
  onClose?: () => void
}

const friendlyPhrases = [
  "Firing up the creative engines... 🚀",
  "Mixing the perfect colors for you... 🎨",
  "Adjusting the spotlight... ✨",
  "Adding a sprinkle of magic... 🪄",
  "Almost there, making it shine... 🌟",
  "Reviewing the pixels... 🧐",
  "Wrapping it up with style... 🎀",
]

export default function GenerationStatus({ isOpen, sessionId, templateId, onClose }: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [countdown, setCountdown] = useState(60)
  const [finalUrl, setFinalUrl] = useState<string | null>(null)
  const router = useRouter()

  // Rotate phrases
  useEffect(() => {
    if (!isOpen) return
    const id = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % friendlyPhrases.length)
    }, 3000)
    return () => clearInterval(id)
  }, [isOpen])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || finalUrl) return
    setCountdown(60) // Reset on open
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
  }, [isOpen, finalUrl])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isOpen || !sessionId) return

    const channel = supabase
      .channel(`generated_posters_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "generated_posters", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as any
          if (row?.image_url) {
            setFinalUrl(row.image_url)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, sessionId])

  // Instant redirect when ready
  useEffect(() => {
    if (finalUrl) {
      router.push(`/payment/${sessionId}`)
    }
  }, [finalUrl, sessionId, router])

  if (!isOpen) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-yellow-400 via-orange-300 to-yellow-500"
    >
      <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-6 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-10 mix-blend-overlay"></div>
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-200 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse delay-700"></div>
        </div>

        <div className="z-10 flex flex-col items-center w-full max-w-xl text-center my-auto">

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
              width={100}
              height={100}
              className="relative z-10 w-24 h-24 md:w-32 md:h-32 drop-shadow-md animate-bounce-slow"
              priority
            />
          </motion.div>

          {/* Status Text */}
          <AnimatePresence mode="wait">
            {finalUrl ? (
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
