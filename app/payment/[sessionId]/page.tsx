"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, ArrowLeft, Smartphone, CreditCard, CheckCircle, XCircle, Clock, Zap, Lock, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { supabase, showToast } from "@/lib/supabase"
import { logInfo, logError, startTimer, elapsedMs } from "@/lib/logger"

import { BackgroundWrapper } from "@/components/ui/background-wrapper"

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [mpesaNumber, setMpesaNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "success" | "failed">("pending")
  const [countdown, setCountdown] = useState(0)
  const [sessionData, setSessionData] = useState<any>(null)

  // Track if we've already verified payment status to prevent flicker
  const [hasVerifiedStatus, setHasVerifiedStatus] = useState(false)

  // Load session and verify status on mount
  useEffect(() => {
    const init = async () => {
      // 1. Load local storage
      let localData: any = null
      try {
        const stored = localStorage.getItem(sessionId)
        if (stored) localData = JSON.parse(stored)
      } catch (e) { /* ignore */ }

      if (localData) {
        setSessionData(localData)

        // If local data says completed, assume success first (optimistic) to prevent flash
        if (localData.paymentStatus === "completed") {
          setPaymentStatus("success")
          setHasVerifiedStatus(true)
          return
        }
      }

      // 2. Fetch fresh status from DB
      try {
        // Check generated_posters first for completion
        const { data: poster } = await supabase
          .from("generated_posters")
          .select("status, template_id")
          .eq("session_id", sessionId)
          .single()

        if (poster && poster.status === "COMPLETED") {
          logInfo("ui/payment", "init_already_completed", { session_id: sessionId })
          setPaymentStatus("success")
          setHasVerifiedStatus(true)

          // Update local storage if needed
          if (localData) {
            const updated = { ...localData, paymentStatus: 'completed' }
            setSessionData(updated)
            localStorage.setItem(sessionId, JSON.stringify(updated))
          }
          return
        }

        // Also check payments table directly
        const { data: pay } = await supabase
          .from("payments")
          .select("status, amount")
          .eq("session_id", sessionId)
          .eq("status", "Paid")
          .limit(1)
          .maybeSingle()

        if (pay) {
          logInfo("ui/payment", "init_payment_found", { session_id: sessionId })
          setPaymentStatus("success")
          setHasVerifiedStatus(true)
          return
        }

        // 3. Refresh Price if still pending
        if (localData?.templateId) {
          const { data: tpl } = await supabase
            .from("poster_templates")
            .select("price")
            .eq("template_id", localData.templateId)
            .single()

          if (tpl) {
            // Only update price, preserve other fields
            const updated = { ...localData, price: tpl.price }
            setSessionData(updated)
            localStorage.setItem(sessionId, JSON.stringify(updated))

            // Auto-complete if free
            if (tpl.price === 0) {
              setPaymentStatus("success")
              router.push(`/download/${sessionId}`)
            }
          }
        }

        setHasVerifiedStatus(true)

      } catch (err) {
        console.error("Payment init error", err)
        setHasVerifiedStatus(true)
      }
    }

    init()
  }, [sessionId, router])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [countdown])

  const formatPhoneNumber = (value: string) => {
    const rawDigits = value.replace(/\D/g, "")
    const normalizedDigits =
      rawDigits.length === 9 && (rawDigits.startsWith("7") || rawDigits.startsWith("1"))
        ? `0${rawDigits}`
        : rawDigits
    const d = normalizedDigits.slice(0, 10)
    if (d.length <= 4) return d
    if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4, 7)}`
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 10)}`
  }

  const validatePhoneNumber = (number: string) => {
    const digits = number.replace(/\D/g, "")
    return digits.length === 10 && (digits.startsWith("07") || digits.startsWith("01"))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    if (formatted.replace(/\D/g, "").length <= 10) {
      setMpesaNumber(formatted)
    }
  }

  const processPayment = async () => {
    if (!validatePhoneNumber(mpesaNumber) || !sessionData) return

    setIsProcessing(true)
    setPaymentStatus("processing")
    setCountdown(60) // 1 minute timeout

    try {
      const t0 = startTimer()
      const digitsOnly = mpesaNumber.replace(/\D/g, "")
      const localPhone = digitsOnly.length === 9 ? `0${digitsOnly}` : digitsOnly

      logInfo("ui/payment", "initiate_click", { session_id: sessionId, phone_local: localPhone })

      // Initiate STK Push
      const res = await fetch("/api/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          phoneNumber: localPhone,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to initiate payment")
      }

      logInfo("ui/payment", "stk_sent", { checkout_id: json.CheckoutRequestID })

      // Start Polling (more frequent: 2s)
      let remainingChecks = 40 // More checks (80s total) to account for slight delays
      const pollInterval = setInterval(async () => {
        remainingChecks--

        try {
          // Check generated_posters status (Primary Source)
          const { data: poster } = await supabase
            .from("generated_posters")
            .select("status")
            .eq("session_id", sessionId)
            .single()

          if (poster?.status === "COMPLETED") {
            clearInterval(pollInterval)
            handlePaymentSuccess()
            return
          }

          // Check payments table (Secondary Source)
          const { data: pay } = await supabase
            .from("payments")
            .select("status")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (pay?.status === "Paid") {
            clearInterval(pollInterval)
            handlePaymentSuccess()
            return
          }

        } catch (e) {
          console.error("Poll error", e)
        }

        if (remainingChecks <= 0) {
          clearInterval(pollInterval)
          // Don't auto-fail immediately, check one last time
          const { data: finalCheck } = await supabase.from("generated_posters").select("status").eq("session_id", sessionId).single()
          if (finalCheck?.status === "COMPLETED") {
            handlePaymentSuccess()
          } else {
            setPaymentStatus("failed")
            setIsProcessing(false)
            showToast("Payment verification timed out. If you paid, please refresh.", "warning")
          }
        }
      }, 2000)

    } catch (error: any) {
      logError("ui/payment", error, { session_id: sessionId })
      showToast(error?.message || "Payment initiation failed", "error")
      setPaymentStatus("failed")
      setIsProcessing(false)
    }
  }

  const handlePaymentSuccess = async () => {
    logInfo("ui/payment", "payment_confirmed", { session_id: sessionId })
    setPaymentStatus("success")
    setIsProcessing(false)

    // Update local storage
    if (sessionData) {
      const updated = { ...sessionData, paymentStatus: "completed" }
      setSessionData(updated)
      localStorage.setItem(sessionId, JSON.stringify(updated))
    }

    // Force unlock in DB just in case (client-side safety net)
    await supabase.from("generated_posters").update({ status: "COMPLETED" }).eq("session_id", sessionId)

    // Instant redirect - no celebration delay to make it feel snappier
    router.replace(`/download/${sessionId}`)
  }

  const retryPayment = () => {
    setPaymentStatus("pending")
    setMpesaNumber("")
    setIsProcessing(false)
  }

  if (!sessionData && hasVerifiedStatus) {
    return (
      <BackgroundWrapper className="flex items-center justify-center">
        <Card className="p-8 text-center bg-surface/95 backdrop-blur-md border-white/20 shadow-card">
          <div className="text-4xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 font-space">Session Not Found</h2>
          <Button onClick={() => router.push("/templates")} className="mt-4 bg-primary text-white">
            Back to Home
          </Button>
        </Card>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Blurred Background Image */}
      {sessionData?.posterUrl && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            src={sessionData.posterUrl}
            alt="Background"
            className="w-full h-full object-cover blur-3xl opacity-30 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        </div>
      )}

      {/* Navbar */}
      <nav className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link href={`/create/${sessionData?.templateId}`}>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <span className="text-white font-bold text-xl font-space">Secure Checkout</span>
        </div>
      </nav>

      <div className="relative z-10 px-4 py-8 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-start">

          {/* Left: Poster Preview (Locked) */}
          <div className="hidden lg:block animate-fadeUp">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-[6px] border-white/20 bg-white/5 backdrop-blur-sm">
              {sessionData?.posterUrl ? (
                <img src={sessionData.posterUrl} className="w-full h-auto blur-sm brightness-75" alt="Preview" />
              ) : (
                <div className="aspect-[3/4] bg-white/10 w-full animate-pulse" />
              )}

              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                <Lock className="w-16 h-16 mb-4 text-white/80" />
                <h3 className="text-2xl font-bold font-space text-center">Unlocks after payment</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center space-x-2 text-white/80 text-sm font-inter">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span>Secure Payment by PesaFlux</span>
            </div>
          </div>

          {/* Right: Payment Form */}
          <Card className="p-8 bg-surface/95 backdrop-blur-xl border-white/20 shadow-card animate-scaleIn">

            {paymentStatus === "success" ? (
              <div className="text-center py-10">
                <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-[bounce_1s_infinite]">
                  <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-2 font-space">Payment Received!</h2>
                <p className="text-text-secondary font-inter mb-6">Redirecting to your download...</p>
                <Link href={`/download/${sessionId}`}>
                  <Button className="w-full bg-success hover:bg-success-hover text-white py-4 font-bold font-space shadow-md">
                    Download Now
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-block p-3 rounded-full bg-primary/10 mb-4">
                    <Smartphone className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-text-primary font-space">M-Pesa Payment</h1>
                  <p className="text-text-secondary font-inter text-sm">Enter your phone number to receive the prompt</p>
                </div>

                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 mb-6 flex justify-between items-center">
                  <div>
                    <p className="text-text-secondary text-sm font-bold font-space uppercase tracking-wider">Total Amount</p>
                    <p className="text-3xl font-bold text-primary">KES {sessionData?.price || "..."}</p>
                  </div>
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-xl">💰</span>
                  </div>
                </div>

                {paymentStatus === "processing" ? (
                  <div className="py-8 text-center space-y-6">
                    <div className="relative mx-auto w-20 h-20">
                      <div className="absolute inset-0 border-4 border-success/30 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-success border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-text-primary font-space">Check your phone</h3>
                      <p className="text-text-secondary text-sm">Enter your M-Pesa PIN to complete payment</p>
                    </div>
                    {countdown > 0 && (
                      <p className="font-mono text-warning font-bold">{countdown}s remaining</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-text-primary font-bold mb-2 block">Phone Number</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          placeholder="07XX XXX XXX"
                          className="pl-12 py-6 text-lg bg-white/50 border-white/20 text-text-primary focus:ring-primary"
                          value={mpesaNumber}
                          onChange={handlePhoneChange}
                          disabled={isProcessing}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={processPayment}
                      disabled={!validatePhoneNumber(mpesaNumber) || isProcessing}
                      className="w-full bg-success hover:bg-success-hover text-white py-6 text-xl font-bold font-space shadow-lg hover:scale-[1.02] transition-transform"
                    >
                      {isProcessing ? "Processing..." : `Pay KES ${sessionData?.price}`}
                    </Button>

                    {paymentStatus === "failed" && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center font-inter border border-red-100 flex items-center justify-center">
                        <XCircle className="w-4 h-4 mr-2" />
                        Payment failed. Please try again.
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-dashed border-gray-200">
                  <p className="text-xs text-center text-text-muted">
                    Secured by PesaFlux. Instant unlock after payment.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
