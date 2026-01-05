"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase, type PosterTemplate, getThumbnailUrl, showToast } from "@/lib/supabase"
import * as Dialog from "@radix-ui/react-dialog"
import { isValidRating, isValidComment } from "@/lib/validation"

import { BackgroundWrapper } from "@/components/ui/background-wrapper"

export default function DownloadPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [sessionData, setSessionData] = useState<any>(null)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestedTemplates, setSuggestedTemplates] = useState<PosterTemplate[]>([])

  useEffect(() => {
    // Load session data from localStorage
    const data = localStorage.getItem(sessionId)
    if (data) {
      const parsedData = JSON.parse(data)
      setSessionData(parsedData)

      // Check if payment was completed (for paid templates)
      if (parsedData.price > 0 && parsedData.paymentStatus !== "completed") {
        // Redirect to payment if not paid
        window.location.href = `/payment/${sessionId}`
      }

      // If poster URL is missing, hydrate from Supabase by session_id
      if (!parsedData.posterUrl) {
        hydratePosterFromSupabase(parsedData)
      }
    }

    // Fetch suggested templates
    fetchSuggestedTemplates()
  }, [sessionId])

  const hydratePosterFromSupabase = async (existing: any) => {
    try {
      const { data, error } = await supabase
        .from("generated_posters")
        .select("image_url, session_id, template_name")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error
      const row = data && data[0]
      const imageUrl = row?.image_url || existing?.posterUrl || ""
      const templateName = row?.template_name || existing?.templateName || ""
      if (imageUrl) {
        const updated = { ...existing, posterUrl: imageUrl, templateName }
        setSessionData(updated)
        try {
          localStorage.setItem(sessionId, JSON.stringify(updated))
        } catch {
          // ignore storage errors
        }
      }
    } catch (err) {
      // silently ignore hydration errors to avoid noisy logs
    }
  }

  const fetchSuggestedTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("poster_templates")
        .select("*")
        .eq("is_active", true)
        .limit(12)

      if (error) throw error

      // Shuffle and pick 6–8 templates for display
      const shuffled = (data || []).sort(() => Math.random() - 0.5)
      const pickCount = Math.min(8, Math.max(6, shuffled.length))
      setSuggestedTemplates(shuffled.slice(0, pickCount))
    } catch (err) {
      // silently ignore suggestions errors to avoid exposing internals
    }
  }

  const downloadPoster = async () => {
    if (!sessionData?.posterUrl) {
      await hydratePosterFromSupabase(sessionData)
      if (!sessionData?.posterUrl) {
        showToast("Poster not ready yet. Please try again in a moment")
        return
      }
    }

    // Force download via API to set Content-Disposition and preserve original bytes
    const apiUrl = `/api/download?url=${encodeURIComponent(sessionData.posterUrl)}&filename=${encodeURIComponent(
      `poster-${sessionData.templateName || "design"}.png`,
    )}`
    try {
      window.location.href = apiUrl
      showToast("Preparing your download…", "success")
    } catch (err) {
      // avoid logging sensitive browser errors
      showToast("Failed to start download. Please try again.")
    }

    setHasDownloaded(true)
    setIsFeedbackOpen(true)

    // Show suggestions after download
    setTimeout(() => {
      setShowSuggestions(true)
    }, 2000)
  }

  const submitFeedback = async () => {
    if (!sessionData) return
    if (!isValidRating(rating)) {
      showToast("Please rate the poster from 1 to 5")
      return
    }
    if (!isValidComment(feedback)) {
      showToast("Comment is too long. Please shorten it")
      return
    }
    setSubmitting(true)
    try {
      const payloadBase: any = {
        phone_number: sessionData.mpesaNumber || sessionData.phoneNumber || "",
        rating,
        comment: feedback || null,
        template_name: sessionData.templateName || null,
      }
      let { error } = await supabase.from("feedback").insert(payloadBase)
      if (error) {
        // Retry without template_name if column is missing
        const fallback: any = { ...payloadBase }
        delete fallback.template_name
        const retry = await supabase.from("feedback").insert(fallback)
        error = retry.error
      }
      if (error) throw error
      setFeedbackSubmitted(true)
      setIsFeedbackOpen(false)
      showToast("We've received your feedback!", "success")
    } catch (err) {
      // avoid logging sensitive feedback errors
      showToast("Failed to submit feedback. Please try again")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
  }

  const renderPosterSrc = (base64?: string, url?: string) => {
    // Prefer base64 if provided; otherwise use the generated image URL from Supabase
    if (base64 && base64.trim().length > 0) {
      return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`
    }
    if (url && typeof url === "string" && url.length > 0) {
      return url
    }
    return "/placeholder.svg?height=400&width=600"
  }

  if (!sessionData) {
    return (
      <BackgroundWrapper className="flex items-center justify-center">
        <Card className="p-8 text-center bg-surface/95 backdrop-blur-md border-white/20 shadow-card">
          <div className="text-4xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 font-space">Session Not Found</h2>
          <p className="text-text-secondary mb-4 font-inter">Looks like your session expired. Let's start over.</p>
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
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/templates">
              <Button
                size="icon"
                className="bg-primary hover:bg-primary-hover text-white transition-all duration-300 shadow-glowOrange"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-white font-bold text-xl font-space drop-shadow-md">Your Poster</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-center items-center">
          <img
            src={renderPosterSrc(sessionData.posterBase64, sessionData.posterUrl)}
            alt="Generated Poster"
            className="max-w-full max-h-[70vh] rounded-lg shadow-card border-2 border-white/20"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = "/placeholder.svg?height=400&width=600"
            }}
          />
        </div>
        <div className="max-w-7xl mx-auto flex justify-center items-center mt-8">
          <Button
            onClick={downloadPoster}
            className="bg-success hover:bg-success-hover text-white px-8 py-6 text-xl font-bold shadow-md hover:scale-105 transition-transform"
          >
            Download Poster
          </Button>
        </div>
        {/* Suggested Posters Section */}
        <div className="max-w-7xl mx-auto mt-12">
          <h2 className="text-center text-2xl md:text-3xl font-bold text-white font-space mb-6 drop-shadow-md">Suggested Posters</h2>
          {showSuggestions && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {suggestedTemplates.map((template) => (
                <Card key={template.template_id} className="p-4 bg-surface/90 backdrop-blur-md border-white/20 shadow-soft hover:shadow-card transition-all">
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-md border border-white/10">
                    <img
                      src={getThumbnailUrl(template.thumbnail_path)}
                      alt={template.template_name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    <h3 className="text-base md:text-lg font-bold text-text-primary font-space line-clamp-2">
                      {template.template_name}
                    </h3>
                    {template.description && (
                      <p className="text-sm text-text-secondary font-inter mt-1 line-clamp-2">{template.description}</p>
                    )}
                    <div className="mt-3">
                      <Link href={`/templates/${template.template_id}`}>
                        <Button className="bg-primary hover:bg-primary-hover text-white w-full shadow-glowOrange">
                          View Template
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {/* Dashboard Button */}
          <div className="mt-10 flex justify-center">
            <a
              href="https://bingwazone.co.ke/login.php"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md">Go back to Dashboard</Button>
            </a>
          </div>
        </div>
        {/* Feedback Modal */}
        <Dialog.Root open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-xl bg-surface p-6 shadow-card z-50 border border-white/20">
              <Dialog.Title className="text-xl font-bold text-text-primary font-space mb-2">Rate your poster</Dialog.Title>
              <Dialog.Description className="text-text-secondary font-inter mb-4">
                Tell us how we did. Your feedback helps improve templates.
              </Dialog.Description>

              <div className="flex items-center space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    className={`text-3xl ${rating >= star ? "text-yellow-400" : "text-gray-300"} transition-colors duration-200`}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional comment"
                className="w-full p-3 border border-border rounded-lg bg-white/50 text-text-primary font-inter mb-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />

              <div className="mt-2 flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <Button variant="ghost" className="text-text-secondary hover:bg-black/5">Skip</Button>
                </Dialog.Close>
                <Button
                  onClick={submitFeedback}
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-hover text-white shadow-glowOrange"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {/* Suggestions moved above; removed old block */}
      </div>
    </BackgroundWrapper>
  )
}
