"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, ArrowLeft, Smartphone, CreditCard, CheckCircle, XCircle, Clock, Zap } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

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

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "")

    // Format as 07XX XXX XXX
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
  }

  const validatePhoneNumber = (number: string) => {
    const digits = number.replace(/\D/g, "")
    return digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    if (formatted.replace(/\D/g, "").length <= 9) {
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

      // Insert payment record into Supabase
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          phone_number: fullPhoneNumber,
          image_url: sessionData.posterUrl,
          mpesa_code: "", // Will be updated by webhook
          status: "Pending",
          time: new Date().toISOString(),
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Send STK push request to Make webhook
      // For now, simulate the process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulate random success/failure for demo
      const success = Math.random() > 0.3 // 70% success rate

      if (success) {
        // Update payment status to Paid
        const mockMpesaCode = `MP${Date.now().toString().slice(-8)}`

        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "Paid",
            mpesa_code: mockMpesaCode,
          })
          .eq("phone_number", fullPhoneNumber)
          .eq("image_url", sessionData.posterUrl)

        if (updateError) throw updateError

        setPaymentStatus("success")

        // Update session data with payment info
        const updatedSession = {
          ...sessionData,
          paymentStatus: "completed",
          paymentTime: Date.now(),
          mpesaNumber: fullPhoneNumber,
          mpesaCode: mockMpesaCode,
        }
        localStorage.setItem(sessionId, JSON.stringify(updatedSession))
      } else {
        // Update payment status to Failed
        const { error: updateError } = await supabase
          .from("payments")
          .update({ status: "Failed" })
          .eq("phone_number", fullPhoneNumber)
          .eq("image_url", sessionData.posterUrl)

        if (updateError) throw updateError

        setPaymentStatus("failed")
      }
    } catch (error) {
      console.error("Payment processing error:", error)
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="glass p-8 text-center">
          <div className="text-4xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-space">Session Not Found</h2>
          <p className="text-blue-200 mb-4 font-inter">Looks like your session expired. Please start over.</p>
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
            <Card className="glass p-8 animate-in fade-in-0 zoom-in-95 duration-1000">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 neon-green">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 font-space">Almost Done!</h2>
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
                    className="glass text-white placeholder-blue-300 border-white/20 focus:border-green-400 focus:neon-green transition-all duration-300 font-inter text-lg py-3"
                  />
                  <p className="text-sm text-blue-300 mt-1 font-inter">
                    Enter your Safaricom number to receive STK push
                  </p>
                </div>

                <Button
                  onClick={processPayment}
                  disabled={!validatePhoneNumber(mpesaNumber)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-4 text-lg font-semibold font-space disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-5 h-5 mr-2" />
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
            <Card className="glass p-8 text-center animate-in fade-in-0 zoom-in-95 duration-1000">
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
            <Card className="glass p-8 text-center animate-in fade-in-0 zoom-in-95 duration-1000">
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
                  <h2 className="text-3xl font-bold text-white mb-2 font-space">You deserved it!</h2>
                  <p className="text-green-400 text-xl font-semibold font-space">Poster yako sasa iko ready.</p>
                  <p className="text-blue-200 font-inter">Payment successful - KSh {sessionData.price}</p>
                </div>

                <Link href={`/download/${sessionId}`}>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-4 text-lg font-semibold font-space">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Download Your Poster
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {paymentStatus === "failed" && (
            <Card className="glass p-8 text-center animate-in fade-in-0 zoom-in-95 duration-1000">
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
