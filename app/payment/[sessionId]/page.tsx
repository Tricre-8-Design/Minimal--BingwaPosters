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
import { isValidKenyaLocalPhone } from "@/lib/validation"

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

      // If it's a free template, redirect to download
      if (parsedData.price === 0) {
        router.push(`/download/${sessionId}`)
      }
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

  // Auto-redirect to download page shortly after successful payment
  useEffect(() => {
    if (paymentStatus === "success") {
      const t = setTimeout(() => {
        router.push(`/download/${sessionId}`)
      }, 1200)
      return () => clearTimeout(t)
    }
  }, [paymentStatus, router, sessionId])

  const formatPhoneNumber = (value: string) => {
    // Format as 07XX XXX XXX (10 digits)
    const d = value.replace(/\D/g, "")
    const parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 7), d.slice(7, 10)].filter(Boolean)
    return parts.join(" ")
  }

  const validatePhoneNumber = (number: string) => {
    // Accept 10-digit local Safaricom format starting with 07 or 01
    return isValidKenyaLocalPhone(number)
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
      const fullPhoneNumber = `+254${mpesaNumber.replace(/\D/g, "")}`

      // Initiate STK Push via backend
      const res = await fetch("/api/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          amount: sessionData.price,
          phoneNumber: fullPhoneNumber,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to initiate payment")
      }

      const checkoutId = json.CheckoutRequestID

      // Poll for payment confirmation by session only to avoid receipt/code swaps
      let remaining = 60
      const poll = async () => {
        const { data, error } = await supabase
          .from("payments")
          .select("status, mpesa_code, created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (!error && data && data.status === "Paid") {
          setPaymentStatus("success")
          const updatedSession = {
            ...sessionData,
            paymentStatus: "completed",
            paymentTime: Date.now(),
            mpesaNumber: fullPhoneNumber,
            mpesaCode: checkoutId,
          }
          localStorage.setItem(sessionId, JSON.stringify(updatedSession))
          return true
        }
        return false
      }

      const interval = setInterval(async () => {
        remaining -= 3
        const done = await poll()
        if (done || remaining <= 0) {
          clearInterval(interval)
          if (!done) {
            setPaymentStatus("failed")
          }
        }
      }, 3000)
    } catch (error: any) {
      // Show a friendly error toast without exposing internals
      const msg = error?.message?.trim() || "Payment could not be initiated. Please try again."
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
<div className="min-h-screen site-gradient-bg flex items-center justify-center section-fade-in transition-smooth">
        <Card className="glass p-8 text-center">
          <div className="text-4xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-space">Session Not Found</h2>
          <p className="text-blue-200 mb-4 font-inter">Looks like your session expired. Please start over.</p>
          <Link href="/templates">
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500 btn-interactive neon-purple">
              Back to Posters
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-neutral-900">
      {/* Blurred poster background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={sessionData?.posterUrl || "/placeholder.svg"}
          alt="Poster background"
          className="w-full h-full object-cover blur-2xl opacity-25 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/60 via-neutral-900/80 to-neutral-900/90" />
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
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center mx-auto mb-4 neon-green">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-white font-bold text-xl font-space">Payment</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {paymentStatus === "pending" && (
            <Card className="glass-dark p-8 animate-in fade-in-0 zoom-in-95 duration-700 shadow-soft">
              {/* Poster preview with lock overlay */}
              <div className="relative mx-auto mb-8 w-full max-w-sm aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/10 shadow-soft">
                <img
                  src={sessionData?.posterUrl || "/placeholder.svg"}
                  alt="Poster preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white shadow-soft">
                    <Lock className="w-5 h-5" />
                    <span className="font-space text-sm">Locked — pay to unlock</span>
                  </div>
                </div>
                <div className="absolute top-3 right-3 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-neutral-900 shadow-soft">
                  KSh {sessionData.price}
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 neon-green">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-1 font-space">Almost Done!</h2>
                <p className="text-blue-200 font-inter">Pay KSh {sessionData.price} to download your poster</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="mpesa" className="text-white font-medium font-space flex items-center mb-2">
                    <CreditCard className="w-4 h-4 mr-2" />
                    M-PESA Number
                  </Label>
                  <Input
                    type="tel"
                    id="mpesa"
                    value={mpesaNumber}
                    onChange={handlePhoneChange}
                    placeholder="07XX XXX XXX"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="glass text-white placeholder-blue-300 border-white/20 focus:border-green-400 focus:neon-green transition-all duration-300 font-inter text-lg py-3"
                  />
                  <p className="text-sm text-blue-300 mt-1 font-inter">
                    Enter your Safaricom number to receive STK push
                  </p>
                </div>

                <Button
                  onClick={processPayment}
                  disabled={!validatePhoneNumber(mpesaNumber)}
                  className="relative w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-4 text-lg font-semibold font-space disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[hsl(var(--accent-blue))] to-[hsl(var(--accent-green))] opacity-20 blur-sm" />
                  <Zap className="relative w-5 h-5 mr-2" />
                  Pay Now
                </Button>

                <div className="text-center text-sm text-blue-300 font-inter">
                  <p>Secure payment powered by Mpesa | PesaFlux | Tricre8</p>
                  <p>Your poster will be available immediately after payment</p>
                </div>
              </div>
            </Card>
          )}

          {paymentStatus === "processing" && (
            <Card className="glass-dark p-8 text-center animate-in fade-in-0 zoom-in-95 duration-700 shadow-soft">
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto shadow-soft"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-emerald-400 border-b-transparent rounded-full animate-spin animate-reverse mx-auto"></div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 font-space">STK Push Sent!</h2>
                  <p className="text-blue-200 font-inter">Check your phone and enter your M-PESA PIN</p>
                </div>

                {countdown > 0 && (
                  <div className="flex items-center justify-center space-x-2 text-yellow-400">
                    <Clock className="w-5 h-5" />
                    <span className="font-mono text-lg">{countdown}s</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-center space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      ></div>
                    ))}
                  </div>
                  <p className="text-sm text-blue-300 font-inter">Waiting for M-PESA confirmation...</p>
                </div>
              </div>
            </Card>
          )}

          {paymentStatus === "success" && (
            <Card className="glass-dark p-8 text-center animate-in fade-in-0 zoom-in-95 duration-700 shadow-soft">
              <div className="space-y-6">
                {/* Success Animation */}
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto neon-green animate-pulse">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  {/* Confetti effect */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full animate-bounce"
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
                  <h2 className="text-3xl font-bold text-white mb-2 font-space">You saved 3 hours of designing the poster!</h2>
                  <p className="text-green-400 text-xl font-semibold font-space">Poster yako iko ready sasa.</p>
                  <p className="text-blue-200 font-inter">Payment successful - KSh {sessionData.price}</p>
                </div>

                <Link href={`/download/${sessionId}`}>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-4 text-lg font-semibold font-space">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Download Your Poster
                  </Button>
                </Link>
                <p className="text-blue-300 font-inter">Redirecting…</p>
              </div>
            </Card>
          )}

          {paymentStatus === "failed" && (
            <Card className="glass-dark p-8 text-center animate-in fade-in-0 zoom-in-95 duration-700 shadow-soft">
              <div className="space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center mx-auto neon-purple">
                  <XCircle className="w-10 h-10 text-white" />
                </div>

                <div>
                  <div className="text-4xl mb-2">⏱️</div>
                  <h2 className="text-2xl font-bold text-white mb-2 font-space">Haijacheza bado?</h2>
                  <p className="text-blue-200 font-inter">
                    Payment didn't go through. Try again ama confirm your M-PESA balance or your network.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={retryPayment}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 btn-interactive neon-purple py-3 font-space"
                  >
                    Try Again
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full glass text-white border-white/20 hover:bg-white/10 btn-interactive bg-transparent"
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
