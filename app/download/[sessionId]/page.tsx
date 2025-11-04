"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase, type PosterTemplate } from "@/lib/supabase"

export default function DownloadPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [sessionData, setSessionData] = useState<any>(null)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
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
    }

    // Fetch suggested templates
    fetchSuggestedTemplates()
  }, [sessionId])

  const fetchSuggestedTemplates = async () => {
    try {
      const { data, error } = await supabase.from("poster_templates").select("*").limit(3)

      if (error) throw error

      setSuggestedTemplates(data || [])
    } catch (err) {
      console.error("Error fetching suggested templates:", err)
    }
  }

  const downloadPoster = () => {
    if (!sessionData?.posterUrl) return

    // Create download link
    const link = document.createElement("a")
    link.href = sessionData.posterUrl
    link.download = `poster-${sessionData.templateName || "design"}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setHasDownloaded(true)

    // Show suggestions after download
    setTimeout(() => {
      setShowSuggestions(true)
    }, 2000)
  }

  const submitFeedback = async () => {
    if (rating === 0 || !sessionData) return

    try {
      // Save feedback to Supabase
      const { error } = await supabase.from("feedback").insert({
        phone_number: sessionData.mpesaNumber || "",
        rating,
        comment: feedback,
        time: new Date().toISOString(),
        template_id: sessionData.templateId,
      })

      if (error) throw error

      setFeedbackSubmitted(true)
    } catch (err) {
      console.error("Error submitting feedback:", err)
      // Still show success for demo purposes
      setFeedbackSubmitted(true)
    }
  }

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
  }

  const renderBase64Image = (base64: string) => {
    if (!base64) return "/placeholder.svg?height=400&width=600"
    return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="glass p-8 text-center">
          <div className="text-4xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-space">Session Not Found</h2>
          <p className="text-blue-200 mb-4 font-inter">Looks like your session expired. Let's start over.</p>
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
            <Link href="/templates">
              <Button
                size="icon"
                className="glass btn-interactive text-white hover:neon-blue transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center neon-purple">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-white font-bold text-xl font-space">Your Poster</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-center items-center">
          <img
            src={renderBase64Image(sessionData.posterBase64) || "/placeholder.svg"}
            alt="Generated Poster"
            className="max-w-full max-h-full"
          />
        </div>
        <div className="max-w-7xl mx-auto flex justify-center items-center mt-8">
          <Button
            onClick={downloadPoster}
            className="bg-gradient-to-r from-purple-500 to-blue-500 btn-interactive neon-purple"
          >
            Download Poster
          </Button>
        </div>
        {hasDownloaded && (
          <div className="max-w-7xl mx-auto flex justify-center items-center mt-8">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    className={`text-2xl ${rating >= star ? "text-yellow-500" : "text-gray-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Leave your feedback"
                className="p-2 border border-gray-300 rounded-lg"
              />
              <Button
                onClick={submitFeedback}
                className="bg-gradient-to-r from-purple-500 to-blue-500 btn-interactive neon-purple ml-4"
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        )}
        {showSuggestions && (
          <div className="max-w-7xl mx-auto flex justify-center items-center mt-8">
            <h2 className="text-2xl font-bold text-white mb-4 font-space">Suggested Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedTemplates.map((template) => (
                <Card key={template.id} className="glass p-4 text-center">
                  <img
                    src={renderBase64Image(template.base64) || "/placeholder.svg"}
                    alt={template.name}
                    className="max-w-full max-h-full mb-4"
                  />
                  <h3 className="text-xl font-bold text-white mb-2 font-space">{template.name}</h3>
                  <p className="text-blue-200 mb-4 font-inter">{template.description}</p>
                  <Link href={`/templates/${template.id}`}>
                    <Button className="bg-gradient-to-r from-purple-500 to-blue-500 btn-interactive neon-purple">
                      View Template
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
