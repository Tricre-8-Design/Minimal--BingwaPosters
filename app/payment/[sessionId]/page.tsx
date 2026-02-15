"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, ArrowLeft, Smartphone, CreditCard, CheckCircle, XCircle, Clock, Zap, Lock } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { supabase, showToast } from "@/lib/supabase"
import { logInfo, logError, safeRedact, startTimer, elapsedMs } from "@/lib/logger"
import { fetchPermanentSessionData, PERMANENT_TEST_SESSION_ID } from "@/lib/permanent-session"

import { BackgroundWrapper } from "@/components/ui/background-wrapper"

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [mpesaNumber, setMpesaNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState("pending") // pending, processing, success, failed
  const [countdown, setCountdown] = useState(0)
  const [sessionData, setSessionData] = useState<any>(null)

  useEffect(() => {
    // Load session data from localStorage
    const data = localStorage.getItem(sessionId)
    if (data) {
      const parsedData = JSON.parse(data)
      setSessionData(parsedData)

      // Fetch latest price from DB to avoid stale or overridden values
      const refreshPrice = async () => {
        try {
          const { data: tpl } = await supabase
            .from("poster_templates")
            .select("price")
            .eq("template_id", parsedData.templateId)
            .limit(1)
            .single()
          if (tpl && typeof tpl.price === "number") {
            const updated = { ...parsedData, price: tpl.price }
            setSessionData(updated)
            localStorage.setItem(sessionId, JSON.stringify(updated))
            if (tpl.price === 0) {
              router.push(`/download/${sessionId}`)
            }
          }
        } catch (_) {
          // Ignore price refresh errors silently
        }
      }
      refreshPrice()
    } else if (sessionId === PERMANENT_TEST_SESSION_ID) {
      // Special handling for permanent test session
      logInfo("ui/payment", "restoring_permanent_session", { sessionId })
      fetchPermanentSessionData(supabase, sessionId).then((restored) => {
        if (restored) {
          setSessionData(restored)
          localStorage.setItem(sessionId, JSON.stringify(restored))
          logInfo("ui/payment", "restored_permanent_session", { sessionId })
        }
      })
    }
  }, [sessionId, router])

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
    // Remove all non-digits
    const rawDigits = value.replace(/\D/g, "")
    // Normalize 9-digit local (7/1) to 10-digit starting with 0
    const normalizedDigits =
      rawDigits.length === 9 && (rawDigits.startsWith("7") || rawDigits.startsWith("1"))
        ? `0${rawDigits}`
        : rawDigits

    // Limit to 10 digits max
    const d = normalizedDigits.slice(0, 10)

    // Format as 07XX XXX XXX
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
    if (!validatePhoneNumber(mpesaNumber) || !sessionData) {
      return
    }

    setIsProcessing(true)
    setPaymentStatus("processing")
    setCountdown(60) // 60 second timeout

    try {
      const t0 = startTimer()
      // Send local format (07XXXXXXXX or 01XXXXXXXX) to backend; server will normalize
      const digitsOnly = mpesaNumber.replace(/\D/g, "")
      const localPhone = digitsOnly.length === 9 ? `0${digitsOnly}` : digitsOnly
      logInfo("ui/payment", "initiate_click", { session_id: sessionId, phone_local: localPhone, price: sessionData?.price })

      // Initiate STK Push via backend
      const res = await fetch("/api/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          phoneNumber: localPhone,
        }),
      })

      const json = await res.json()
      logInfo("ui/payment", "initiate_response", { status: res.status, ok: res.ok, keys: Object.keys(json || {}), elapsed_ms: elapsedMs(t0) })
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to initiate payment")
      }

      const checkoutId = json.CheckoutRequestID
      logInfo("ui/payment", "checkout_id_received", { CheckoutRequestID: checkoutId, MerchantRequestID: json.MerchantRequestID })

      // Poll for payment confirmation
      let remaining = 60
      const poll = async () => {
        // Check latest payment row for this session
        const { data: pay, error: payErr } = await supabase
          .from("payments")
          .select("status, mpesa_code, id")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (!payErr && pay && pay.status === "Paid") {
          logInfo("ui/payment", "paid_detected", { payment_id: pay.id, mpesa_code: pay.mpesa_code })
          setPaymentStatus("success")
          const updatedSession = {
            ...sessionData,
            paymentStatus: "completed",
            paymentTime: Date.now(),
            mpesaNumber: localPhone,
            mpesaCode: pay.mpesa_code || checkoutId,
          }
          localStorage.setItem(sessionId, JSON.stringify(updatedSession))
          // Redirect to download immediately on success
          router.replace(`/download/${sessionId}`)
          return true
        }

        // Fallback: check poster status
        const { data: poster, error: posterErr } = await supabase
          .from("generated_posters")
          .select("status")
          .eq("session_id", sessionId)
          .limit(1)
          .single()
        if (!posterErr && poster?.status === "COMPLETED") {
          logInfo("ui/payment", "poster_completed", { session_id: sessionId })
          setPaymentStatus("success")
          router.replace(`/download/${sessionId}`)
          return true
        }

        logInfo("ui/payment", "poll_pending", { remaining })
        return false
      }

      const interval = setInterval(async () => {
        remaining -= 3
        const done = await poll()
        if (done || remaining <= 0) {
          clearInterval(interval)
          if (!done) {
            logInfo("ui/payment", "poll_timeout", { session_id: sessionId })
            setPaymentStatus("failed")
          }
        }
      }, 3000)
    } catch (error: any) {
      // Show a friendly error toast without exposing internals
      const msg = error?.message?.trim() || "Payment could not be initiated. Please try again."
      logError("ui/payment", error, { session_id: sessionId })
      showToast(msg, "error")
      setPaymentStatus("failed")
    } finally {
      setIsProcessing(false)
      setCountdown(0)
    }
  }

  const retryPayment = () => {
    setPaymentStatus("pending")
    setMpesaNumber("")
  }

  if (!sessionData) {
    return (
      <BackgroundWrapper className="flex items-center justify-center">
        <Card className="p-8 text-center bg-surface/95 backdrop-blur-md border-white/20 shadow-card">
          <div className="text-4xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 font-space">Session Not Found</h2>
          <p className="text-text-secondary mb-4 font-inter">Looks like your session expired. Please start over.</p>
          <Link href="/templates">
            <Button className="bg-primary hover:bg-primary-hover text-white shadow-glowOrange">
              Back to Posters
            </Button>
          </Link>
        </Card>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Blurred poster background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={sessionData?.posterUrl || "/placeholder.svg"}
          alt="Poster background"
          className="w-full h-full object-cover blur-2xl opacity-25 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/25 to-primary/30" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href={`/create/${sessionData?.templateId}`}>
              <Button
                size="icon"
                className="bg-primary hover:bg-primary-hover text-white transition-all duration-300 shadow-glowOrange"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-success rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-white font-bold text-xl font-space drop-shadow-md">Payment</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {paymentStatus === "pending" && (
            <Card className="p-8 animate-scaleIn shadow-card bg-surface/95 backdrop-blur-md border-white/20">
              {/* Poster preview with lock overlay */}
              <div className="relative mx-auto mb-8 w-full max-w-sm aspect-[3/4] overflow-hidden rounded-xl border border-white/30 shadow-soft">
                <img
                  src={sessionData?.posterUrl || "/placeholder.svg"}
                  alt="Poster preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/45 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-text-primary shadow-md">
                    <Lock className="w-5 h-5" />
                    <span className="font-space text-sm">Locked — pay to unlock</span>
                  </div>
                </div>
                <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-text-primary shadow-md">
                  KSh {sessionData.price}
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-1 font-space">Almost Done!</h2>
                <p className="text-text-secondary font-inter">Pay KSh {sessionData.price} to download your poster</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="mpesa" className="text-text-primary font-medium font-space flex items-center mb-2">
                    <CreditCard className="w-4 h-4 mr-2" />
                    M-PESA Number
                  </Label>
                  <Input
                    type="tel"
                    id="mpesa"
                    value={mpesaNumber}
                    onChange={handlePhoneChange}
                    placeholder="07XX XXX XXX"
                    className="text-lg py-6 bg-white/50 focus:bg-white border-white/30"
                  />
                  <p className="text-sm text-text-muted mt-1 font-inter">
                    Enter your Safaricom number to receive STK push
                  </p>
                </div>

                <Button
                  onClick={processPayment}
                  disabled={!validatePhoneNumber(mpesaNumber)}
                  className="relative w-full bg-success hover:bg-success-hover text-white py-4 text-lg font-semibold font-space disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-md"
                >
                  <span className="absolute -inset-0.5 rounded-xl bg-white/20 opacity-40 blur-sm" />
                  <Zap className="relative w-5 h-5 mr-2" />
                  Pay Now
                </Button>

                <div className="text-center text-sm text-text-muted font-inter bg-white/50 py-2 rounded-lg">
                  <p>Secure payment powered by Mpesa | Tricre8</p>
                  <p>Your poster will be available immediately after payment</p>
                </div>
              </div>
            </Card>
          )}

          {paymentStatus === "processing" && (
            <Card className="p-8 text-center animate-scaleIn shadow-card bg-surface/95 backdrop-blur-md border-white/20">
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-success border-t-transparent rounded-full animate-spin mx-auto shadow-md"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-success border-b-transparent rounded-full animate-spin animate-reverse mx-auto"></div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2 font-space">STK Push Sent!</h2>
                  <p className="text-text-secondary font-inter">Check your phone and enter your M-PESA PIN</p>
                </div>

                {countdown > 0 && (
                  <div className="flex items-center justify-center space-x-2 text-warning">
                    <Clock className="w-5 h-5" />
                    <span className="font-mono text-lg">{countdown}s</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-center space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-success rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      ></div>
                    ))}
                  </div>
                  <p className="text-sm text-text-muted font-inter">Waiting for M-PESA confirmation...</p>
                </div>
              </div>
            </Card>
          )}

          {paymentStatus === "success" && (
            <Card className="p-8 text-center animate-scaleIn shadow-card bg-surface/95 backdrop-blur-md border-white/20">
              <div className="space-y-6">
                {/* Success Animation */}
                <div className="relative">
                  <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto animate-pulse shadow-lg">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  {/* Confetti effect */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-warning rounded-full animate-bounce"
                        style={{
                          left: `${20 + i * 5}%`,
                          top: `${10 + (i % 3) * 20}%`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: "1s",
                        }}
                      ></div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-4xl mb-2">🔥</div>
                  <h2 className="text-3xl font-bold text-text-primary mb-2 font-space">You saved 3 hours of designing the poster!</h2>
                  <p className="text-success text-xl font-semibold font-space">Poster yako iko ready sasa.</p>
                  <p className="text-text-secondary font-inter">Payment successful - KSh {sessionData.price}</p>
                </div>

                <Link href={`/download/${sessionId}`}>
                  <Button className="w-full bg-success hover:bg-success-hover text-white py-4 text-lg font-semibold font-space shadow-md">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Download Your Poster
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {paymentStatus === "failed" && (
            <Card className="p-8 text-center animate-scaleIn shadow-card bg-surface/95 backdrop-blur-md border-white/20">
              <div className="space-y-6">
                <div className="w-20 h-20 bg-danger rounded-full flex items-center justify-center mx-auto shadow-md">
                  <XCircle className="w-10 h-10 text-white" />
                </div>

                <div>
                  <div className="text-4xl mb-2">⏱️</div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2 font-space">Haijacheza bado?</h2>
                  <p className="text-text-secondary font-inter">
                    Payment didn't go through. Try again ama confirm your M-PESA balance or your network.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={retryPayment}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3 font-space shadow-glowOrange"
                  >
                    Try Again
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border border-white/30 bg-white/50 text-text-primary hover:bg-white/80"
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </BackgroundWrapper>
  )
}
