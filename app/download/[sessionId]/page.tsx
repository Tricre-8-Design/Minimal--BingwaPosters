"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, ArrowLeft, Download, Star, MessageSquare, Check, Home } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase, type PosterTemplate, getThumbnailUrl, showToast } from "@/lib/supabase"
import * as Dialog from "@radix-ui/react-dialog"
import { isValidRating, isValidComment } from "@/lib/validation"
import { BackgroundWrapper } from "@/components/ui/background-wrapper"
import confetti from "canvas-confetti"

export default function DownloadPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const [sessionData, setSessionData] = useState<any>(null)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [suggestedTemplates, setSuggestedTemplates] = useState<PosterTemplate[]>([])

  useEffect(() => {
    // Fire confetti on mount
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Load session data
    const data = localStorage.getItem(sessionId)
    if (data) {
      const parsedData = JSON.parse(data)
      setSessionData(parsedData)

      // Auto-hydrate if missing URL
      if (!parsedData.posterUrl) {
        fetchPosterFromDB(parsedData)
      }
    } else {
      // Fallback fetch if no local storage
      fetchPosterFromDB({})
    }

    fetchSuggestedTemplates()
  }, [sessionId])

  const fetchPosterFromDB = async (existing: any) => {
    try {
      const { data } = await supabase
        .from("generated_posters")
        .select("*")
        .eq("session_id", sessionId)
        .single()

      // Try to get phone from payments if missing
      let phone = existing.mpesaNumber
      if (!phone) {
        const { data: payData } = await supabase
          .from("payments")
          .select("phone_number")
          .eq("session_id", sessionId)
          .eq("status", "Paid")
          .limit(1)
          .maybeSingle()
        if (payData) phone = payData.phone_number
      }

      if (data) {
        const merged = {
          ...existing,
          posterUrl: data.image_url,
          templateName: data.template_name,
          mpesaNumber: phone // Preserve if exists or found
        }
        setSessionData(merged)
        localStorage.setItem(sessionId, JSON.stringify(merged))
      }
    } catch (e) {
      console.error("Fetch poster error", e)
    }
  }

  const fetchSuggestedTemplates = async () => {
    try {
      const { data } = await supabase
        .from("poster_templates")
        .select("*")
        .eq("is_active", true)
        .limit(12)

      if (data) {
        const shuffled = data.sort(() => Math.random() - 0.5)
        setSuggestedTemplates(shuffled.slice(0, 4))
      }
    } catch (err) { }
  }

  const downloadPoster = () => {
    if (!sessionData?.posterUrl) return

    const apiUrl = `/api/download?url=${encodeURIComponent(sessionData.posterUrl)}&filename=${encodeURIComponent(
      `poster-${sessionData.templateName || "design"}.png`,
    )}`

    // Trigger download
    window.location.href = apiUrl
    showToast("Downloading your masterpiece...", "success")
    setHasDownloaded(true)

    // Open feedback after short delay
    setTimeout(() => setIsFeedbackOpen(true), 2000)
  }

  const submitFeedback = async () => {
    if (!isValidRating(rating)) {
      showToast("Please give a rating", "error")
      return
    }
    setSubmitting(true)
    try {
      await supabase.from("feedback").insert({
        phone_number: sessionData?.mpesaNumber ? Number(sessionData.mpesaNumber) : null,
        rating,
        comment: feedback,
        template_name: sessionData?.templateName
      })
      setFeedbackSubmitted(true)
      setIsFeedbackOpen(false)
      showToast("Thanks for your feedback!", "success")
    } catch (e) {
      showToast("Could not save feedback", "error")
    } finally {
      setSubmitting(false)
    }
  }

  if (!sessionData) return null // Loading state handled by skeleton or parent

  return (
    <BackgroundWrapper>
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <nav className="relative z-10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/templates">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Create Another
            </Button>
          </Link>
          <h1 className="font-space font-bold text-white text-xl flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-warning animate-spin-slow" />
            BingwaPosters
          </h1>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="max-w-3xl mx-auto text-center mb-8 animate-fadeUp">
          <div className="inline-block px-4 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-space mb-4 animate-bounce">
            🎉 Payment Confirmed!
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-space mb-4 drop-shadow-lg">
            Your Poster is Ready!
          </h1>
          <p className="text-lg text-white/80 font-inter max-w-xl mx-auto">
            Boom! Using AI just saved you hours of work. Here is your masterpiece.
          </p>
        </div>

        <div className="w-full max-w-lg mx-auto flex flex-col gap-8 animate-scaleIn delay-100">
          {/* Poster Display */}
          <div className="relative group w-full">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary rounded-2xl opacity-50 blur-xl group-hover:opacity-75 transition-opacity duration-500"></div>
            <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 bg-black/20 backdrop-blur-sm">
              <img
                src={sessionData.posterUrl}
                alt="Final Poster"
                className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-6 -right-6 bg-white text-text-primary px-4 py-2 rounded-xl shadow-xl font-bold font-space transform rotate-3 flex items-center text-sm z-20">
              <Check className="w-4 h-4 text-success mr-2" />
              Paid & Unlocked
            </div>
          </div>

          {/* Actions */}
          <div className="w-full space-y-6">
            <Card className="p-6 bg-surface/90 backdrop-blur-xl border-white/20 shadow-card text-center">
              <h3 className="text-xl font-bold text-text-primary font-space mb-2">Download Your Poster</h3>
              <p className="text-text-secondary mb-6 text-sm">
                High-quality PNG ready for social media.
              </p>

              <Button
                onClick={downloadPoster}
                className="w-full bg-primary hover:bg-primary-hover text-white py-6 text-xl font-bold font-space shadow-[0_0_30px_rgba(255,75,14,0.4)] hover:shadow-[0_0_50px_rgba(255,75,14,0.6)] hover:-translate-y-1 transition-all duration-300"
              >
                <Download className="w-6 h-6 mr-3" />
                Download to Device
              </Button>
            </Card>

            {/* Next Steps */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/templates" className="w-full">
                <div className="bg-white/10 hover:bg-white/20 p-4 rounded-lg cursor-pointer transition-colors text-center group border border-white/10 h-full flex flex-col justify-center items-center">
                  <Home className="w-5 h-5 text-white mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm text-white font-inter">Create Another</span>
                </div>
              </Link>
              <div
                onClick={() => setIsFeedbackOpen(true)}
                className="bg-white/10 hover:bg-white/20 p-4 rounded-lg cursor-pointer transition-colors text-center group border border-white/10 h-full flex flex-col justify-center items-center"
              >
                <MessageSquare className="w-5 h-5 text-white mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-white font-inter">Feedback</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Templates */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold text-white font-space mb-8 text-center opacity-80">You might also like</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {suggestedTemplates.map(t => (
            <Link href={`/create/${t.template_id}`} key={t.template_id}>
              <div className="group relative rounded-lg overflow-hidden border border-white/10 aspect-[3/4] hover:shadow-glowOrange transition-all duration-500 cursor-pointer">
                <img src={getThumbnailUrl(t.thumbnail_path)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={t.template_name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <p className="text-white font-bold font-space text-sm">{t.template_name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Feedback Modal */}
      <Dialog.Root open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn" />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <Dialog.Content className="pointer-events-auto w-[90vw] max-w-md rounded-2xl bg-surface p-8 shadow-2xl border border-white/20 animate-scaleIn">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-primary fill-current" />
                </div>
                <Dialog.Title className="text-2xl font-bold text-text-primary font-space mb-2">Rate your experience</Dialog.Title>
                <Dialog.Description className="text-text-secondary font-inter">
                  How was your Poster?
                </Dialog.Description>
              </div>

              {!feedbackSubmitted ? (
                <>
                  <div className="flex justify-center space-x-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-4xl transition-transform hover:scale-110 focus:outline-none ${rating >= star ? "text-yellow-400" : "text-gray-300"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Any comments? (Optional)"
                    className="w-full p-4 border border-border rounded-xl bg-white/50 text-text-primary font-inter mb-6 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none h-24"
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      className="flex-1 text-text-secondary hover:bg-black/5"
                      onClick={() => {
                        setIsFeedbackOpen(false)
                        setIsWhatsAppOpen(true)
                      }}
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={submitFeedback}
                      disabled={submitting}
                      className="flex-[2] bg-primary hover:bg-primary-hover text-white shadow-glowOrange"
                    >
                      {submitting ? "Sending..." : "Send Feedback"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">❤️</div>
                  <h3 className="text-xl font-bold text-text-primary font-space mb-2">Thank you!</h3>
                  <p className="text-text-secondary">Your feedback helps us improve.</p>
                  <Button onClick={() => setIsFeedbackOpen(false)} className="mt-6 w-full bg-primary text-white">
                    Close
                  </Button>
                </div>
              )}
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

      {/* WhatsApp Modal */}
      <Dialog.Root open={isWhatsAppOpen} onOpenChange={setIsWhatsAppOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn" />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <Dialog.Content className="pointer-events-auto w-[90vw] max-w-sm rounded-2xl bg-surface p-8 shadow-2xl border border-white/20 animate-scaleIn text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-success fill-current" />
              </div>
              <Dialog.Title className="text-xl font-bold text-text-primary font-space mb-2">Not In the Whatsapp group?</Dialog.Title>
              <Dialog.Description className="text-text-secondary font-inter mb-6">
                You are missing alot. Join our WhatsApp group to get poster updates, tips, and more!
              </Dialog.Description>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => window.open("https://chat.whatsapp.com/K7nt6n1JAYUGbB0wo4mS5x", "_blank")}
                  className="w-full bg-success hover:bg-success-hover text-white shadow-md font-bold py-6"
                >
                  Join WhatsApp Group
                </Button>
                <Dialog.Close asChild>
                  <Button variant="ghost" className="w-full text-text-secondary">Maybe Later</Button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

    </BackgroundWrapper>
  )
}
