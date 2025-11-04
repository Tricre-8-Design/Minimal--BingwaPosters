"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Download, Loader2, CheckCircle, XCircle, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { showToast } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { payWithPaystack } from "@/lib/paystack"

const loadingMessages = [
  "Hustling up your poster…",
  "Cooking the colors just right…",
  "Kupanga fonts kama pro…",
  "Polishing pixels, kiasi tu…",
  "Mpesa vibes loading…",
  "Almost done – uko fiti!",
]

export default function ProgressPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [isLoadingPoster, setIsLoadingPoster] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<any>(null)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)
  const [currentLoadingMessageIndex, setCurrentLoadingMessageIndex] = useState(0)

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
          console.log("Session data found in localStorage.")
        } else if (Date.now() - started >= MAX_SESSION_DATA_POLLING_MS) {
          setError("Session data not found after multiple attempts. Please start over.")
          setIsLoadingPoster(false)
          if (sessionDataPollingInterval) clearInterval(sessionDataPollingInterval)
          console.error("Timed out waiting for session data in localStorage.")
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
          console.log("Poster image_url found:", url)
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error waiting for poster:", err)
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

  // Animated loading messages effect
  useEffect(() => {
    if (isLoadingPoster || isVerifyingPayment) {
      const id = setInterval(() => {
        setCurrentLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length)
      }, 2000)
      return () => clearInterval(id)
    }
  }, [isLoadingPoster, isVerifyingPayment])

  // Polling for payment status (after Paystack success)
  useEffect(() => {
    if (!isVerifyingPayment || !sessionId) return

    let paymentPollingInterval: NodeJS.Timeout | null = null

    const startPaymentPolling = () => {
      paymentPollingInterval = setInterval(async () => {
        console.log("Polling for payment status...")
        const { data, error } = await supabase
          .from("payments")
          .select("status, mpesa_code")
          .eq("session_id", sessionId)
          .eq("status", "Paid")
          .single()

        if (error && error.code !== "PGRST116") {
          console.error("Error polling payments:", error)
          return
        }

        if (data && data.status === "Paid") {
          console.log("Payment successful!")
          setIsVerifyingPayment(false)
          if (paymentPollingInterval) clearInterval(paymentPollingInterval)
          downloadPoster()
        }
      }, 3000)
    }

    startPaymentPolling()

    return () => {
      if (paymentPollingInterval) clearInterval(paymentPollingInterval)
    }
  }, [isVerifyingPayment, sessionId])

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
    if (!sessionData || !sessionData.price || !sessionData.userEmail || !sessionData.userPhone) {
      showToast("Missing payment details. Please go back and try again.", "error")
      return
    }

    payWithPaystack({
      email: sessionData.userEmail,
      phone: sessionData.userPhone,
      amountKES: sessionData.price,
      sessionId: sessionId,
      templateId: sessionData.templateId,
      onSuccess: (response) => {
        console.log("Paystack transaction initiated successfully:", response)
        setIsVerifyingPayment(true)
        showToast("Payment initiated. Please complete the transaction on your phone.", "info")
      },
      onCancel: () => {
        console.log("Paystack transaction cancelled.")
        showToast("Payment cancelled.", "warning")
        setIsVerifyingPayment(false)
      },
      onError: (error) => {
        console.error("Paystack transaction error:", error)
        showToast(`Payment error: ${error.message || "An unknown error occurred."}`, "error")
        setIsVerifyingPayment(false)
      },
    })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
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
              <Loader2 className="w-16 h-16 text-purple-400 animate-spin mb-6" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentLoadingMessageIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-lg font-medium text-blue-200 font-inter"
                >
                  {loadingMessages[currentLoadingMessageIndex]}
                </motion.span>
              </AnimatePresence>
              <p className="text-blue-300 text-sm mt-4">Please do not close this page.</p>
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
