"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sparkles,
  ArrowLeft,
  Upload,
  Eye,
  Zap,
  Loader2,
  ImageIcon,
  Type,
  Palette,
  AlertCircle,
  Download,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { supabase, type PosterTemplate, showToast, testSupabaseConnection, getThumbnailUrl } from "@/lib/supabase"
import { fetchJsonFriendly } from "@/lib/client-errors"
import { PosterStatus, type PosterStatusType } from "@/lib/status"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"

// Dynamically import GenerationStatus with SSR disabled to prevent server-side vendor-chunk resolution
// Use a stable relative path to avoid alias resolution issues during chunking in dev/prod.
const GenerationStatus = dynamic(
  () => import(/* webpackChunkName: "ui-generation-status" */ "../../../components/ui/generation-status").then((m) => m.default),
  {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-lg ring-1 ring-black/10">
        <div className="flex items-center justify-center">
          <div aria-label="Loading" className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
        <p className="mt-4 text-center text-base font-medium text-gray-900">Preparing generation UI…</p>
      </div>
    </div>
  ),
  },
)

export default function CreatePoster() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [template, setTemplate] = useState<PosterTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [connectionError, setConnectionError] = useState(false)

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isGenerating, setIsGenerating] = useState(false) // State for generation loading
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(null)
  const [posterStatus, setPosterStatus] = useState<PosterStatusType | null>(null)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [sessionId, setSessionId] = useState("")

  // Auto text contrast helper: returns 'text-white' or 'text-neutral-900' based on background brightness
  const getTextColorClassForBg = (hex?: string) => {
    if (!hex) return "text-white"
    const clean = hex.replace("#", "")
    if (clean.length !== 6) return "text-white"
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    // Relative luminance
    const toLinear = (c: number) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    return L > 0.5 ? "text-neutral-900" : "text-white"
  }

  const loadingMessages = [
    "Design smarter, not harder.",
    "You'll never wait for a designer again.",
    "Polish your hustle shoes… your poster is almost ready!",
    "Mixing your colors...",
    "Sharpening the edges… applying digital makeup 😎",
  ]

  useEffect(() => {
    // Generate session ID
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

    // Test connections on component mount
    testConnections()

    // Fetch template from Supabase
    fetchTemplate()
  }, [templateId])

  const testConnections = async () => {

    // Test Supabase
    const supabaseResult = await testSupabaseConnection()
    if (!supabaseResult.success) {
      setConnectionError(true)
      showToast(`Database connection failed: ${supabaseResult.error}`, "error")
    }

    // No external webhook; generation handled via backend API and Placid
  }

  const fetchTemplate = async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch template by ID

      const { data, error } = await supabase
        .from("poster_templates")
        .select("*")
        .eq("template_id", templateId)
        .eq("is_active", true)
        .single()

      if (error) {

        // Handle specific error cases
        if (error.code === "PGRST116") {
          throw new Error("Template not found. Please check the template ID.")
        } else if (error.message.includes('relation "poster_templates" does not exist')) {
          throw new Error("Database table 'poster_templates' does not exist. Please run the database setup script.")
        } else if (error.message.includes("permission denied")) {
          throw new Error("Permission denied. Please check your database RLS policies.")
        } else {
          throw new Error(`Database error: ${error.message}`)
        }
      }

      if (!data) {
        throw new Error("Template not found or has been removed.")
      }

      // Template fetched successfully
      setTemplate(data)

      // Validate template structure
      if (!data.template_uuid) {
        showToast("Template configuration issue: missing UUID", "error")
      }

      if (!data.fields_required || !Array.isArray(data.fields_required)) {
        showToast("Template configuration issue: invalid fields", "error")
      }

      // Initialize form data with empty values
      const initialFormData: Record<string, any> = {}
      data.fields_required?.forEach((field) => {
        initialFormData[field.name] = field.type === "image" ? null : ""
      })
      setFormData(initialFormData)
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load template. Please try again."
      setError(errorMessage)
      showToast(errorMessage, "error")
      setConnectionError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageUpload = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image too large. Please use an image smaller than 5MB.", "error")
        return
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file.", "error")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData((prev) => ({
          ...prev,
          [field]: e.target?.result,
        }))
      }
      reader.onerror = () => {
        showToast("Failed to read image file.", "error")
      }
      reader.readAsDataURL(file)
    }
  }

  // New handler for the Generate button
  const handleGenerateClick = async () => {
    if (isGenerating) return

    if (!template) {
      showToast("Template not loaded", "error")
      return
    }

    // Validate required fields
    const missingFields =
      template.fields_required?.filter(
        (field) => field.required && (!formData[field.name] || formData[field.name] === ""),
      ) || []

    if (missingFields.length > 0) {
      showToast(`Please fill in required fields: ${missingFields.map((f) => f.label).join(", ")}`, "error")
      return
    }

    setIsGenerating(true)
    let messageIndex = 0

    // Cycle through loading messages
    const messageInterval = setInterval(() => {
      setLoadingMessage(loadingMessages[messageIndex])
      messageIndex = (messageIndex + 1) % loadingMessages.length
    }, 1500)

    try {

      const result = await fetchJsonFriendly<{ success: boolean; image_url?: string | null; session_id?: string }>(
        "/api/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_uuid: template.template_uuid,
            template_id: template.template_id,
            input_data: formData,
            session_id: sessionId,
          }),
        },
        { retryCount: 1, userMessage: "Couldn’t generate your poster right now — we’re trying again." },
      )

      if (!result.ok) {
        throw new Error(result.message || "Failed to generate poster via Placid")
      }

      const body = result.data || {}
      if (body.image_url) {
        setGeneratedPoster(body.image_url)
        showToast("Poster generated successfully!", "success")
        setIsGenerating(false)
      } else {
        // No immediate image_url: generation queued. Rely on realtime updates without sending a notify toast.
      }
    } catch (err: any) {
      showToast("We couldn’t generate your poster right now.", "error")
      setError("Failed to generate poster. Please try again.")
    } finally {
      clearInterval(messageInterval)
      setLoadingMessage("")
    }
  }

  // Subscribe to Supabase Realtime for generated poster insertions by session_id
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel("generated_posters")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "generated_posters", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const poster = payload.new as any
          if (poster) {
            setPosterStatus(poster.status ?? null)
          }
          if (poster?.image_url) {
            setGeneratedPoster(poster.image_url)
            showToast("Poster generated successfully! Proceed to payment.", "success")
            setIsGenerating(false)
          }
        },
      )
      .subscribe()

    // Also subscribe to UPDATE events for when callback updates image_url
    const updatesChannel = supabase
      .channel("generated_posters_updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "generated_posters", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const poster = payload.new as any
          if (poster) {
            setPosterStatus(poster.status ?? null)
          }
          if (poster?.image_url) {
            setGeneratedPoster(poster.image_url)
            if (poster.status === PosterStatus.AWAITING_PAYMENT) {
              showToast("Poster generated successfully! Proceed to payment.", "success")
            }
            if (poster.status === PosterStatus.COMPLETED) {
              showToast("Payment received. Poster unlocked!", "success")
            }
            setIsGenerating(false)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(updatesChannel)
    }
  }, [sessionId])

  // Persist session details for payment page when poster is ready
  useEffect(() => {
    if (generatedPoster && template && sessionId) {
      // Persist minimal session info for payment; force test price = KSh 1
      const sessionInfo = {
        posterUrl: generatedPoster,
        templateId: template.template_id,
        price: 1,
      }
      try {
        localStorage.setItem(sessionId, JSON.stringify(sessionInfo))
      } catch (e) {
        // Silent failure; session info is optional and can be re-derived
      }
    }
  }, [generatedPoster, template, sessionId])

  const renderBase64Image = (base64: string) => {
    if (!base64) return "/placeholder.svg?height=400&width=600"
    return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`
  }

  if (loading) {
    return (
<div className="min-h-screen site-gradient-bg flex items-center justify-center section-fade-in transition-smooth">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
          <p className="text-white font-space text-xl">Loading template...</p>
          <p className="text-blue-200 font-inter text-sm">Fetching from Template store...</p>
        </div>
      </div>
    )
  }

  if (error || !template) {
    return (
<div className="min-h-screen site-gradient-bg flex items-center justify-center section-fade-in transition-smooth">
        <Card className="glass p-8 text-center max-w-md">
          <div className="text-4xl mb-4">{connectionError ? "🔌" : "😯"}</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-space">
            {connectionError ? "Connection Problem" : "Aii! Makosa Imefanyika."}
          </h2>
          <p className="text-blue-200 mb-4 font-inter">{error || "This template doesn't exist or has been removed."}</p>

          {connectionError && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-200">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-inter">Database connection issues detected</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Link href="/templates">
              <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 btn-interactive neon-purple">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
            <Button onClick={fetchTemplate} className="w-full glass btn-interactive text-white hover:neon-blue">
              <Zap className="w-4 h-4 mr-2" />
              Let's Try Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen site-gradient-bg relative overflow-hidden section-fade-in scroll-fade-in transition-smooth">
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
              <span className="text-white font-bold text-xl font-space">Create Poster</span>
            </div>
          </div>

          {connectionError && (
            <div className="flex items-center space-x-2 text-yellow-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-inter">Connection Issues</span>
            </div>
          )}
        </div>
      </nav>

      {/* Header Banner */}
      <section className="relative z-10 px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <Card className="glass p-6 text-center animate-in fade-in-0 slide-in-from-top-4 duration-1000">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-2xl">✌️</span>
              <h2 className="text-xl font-bold text-white mb-2 font-space">Let's get this thing done!</h2>
            </div>
            <p className="text-blue-200 font-inter">Just fill the details and watch the magic happen...</p>
          </Card>
        </div>
      </section>

      {/* Full-screen, accessible loading overlay while generation is in progress */}
      <GenerationStatus
        isOpen={isGenerating}
        sessionId={sessionId}
        templateId={template?.template_id}
        onClose={() => setIsGenerating(false)}
      />

      <div className="relative z-10 px-4 md:px-6 pb-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="glass p-8 animate-in fade-in-0 slide-in-from-left-4 duration-1000">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2 font-space">{template.template_name}</h3>
              <p className="text-blue-200 font-inter">{template.description}</p>
              <div className="mt-2 flex items-center space-x-4">
                <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full font-inter">
                  {template.category}
                </span>
              </div>
            </div>

            <form className="space-y-6">
              {" "}
              {/* Removed onSubmit={handleSubmit} */}
              {template.fields_required?.map((field, index) => (
                <div
                  key={field.name}
                  className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Label
                    htmlFor={field.name}
                    className={`${getTextColorClassForBg((formData.background_color || formData.bgColor) as string)} font-medium font-space flex items-center`}
                  >
                    {field.type === "image" && <ImageIcon className="w-4 h-4 mr-2" />}
                    {field.type === "text" && <Type className="w-4 h-4 mr-2" />}
                    {field.type === "textarea" && <Palette className="w-4 h-4 mr-2" />}
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </Label>

                  {field.type === "image" ? (
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center hover:border-purple-400 hover:neon-purple transition-all duration-300 group">
                        <input
                          type="file"
                          id={field.name}
                          accept="image/*"
                          onChange={(e) => handleImageUpload(field.name, e)}
                          className="hidden"
                        />
                        <label
                          htmlFor={field.name}
                          className="cursor-pointer flex flex-col items-center space-y-2 group-hover:scale-105 transition-transform duration-300"
                        >
                          <Upload className="w-8 h-8 text-blue-300 group-hover:text-purple-300" />
                          <span className="text-blue-200 font-inter">Click to upload or drag & drop</span>
                          <span className="text-sm text-blue-300 font-inter">PNG, JPG up to 5MB</span>
                        </label>
                      </div>

                      {formData[field.name] && (
                        <div className="relative">
                          <img
                            src={formData[field.name] || "/placeholder.svg"}
                            alt="Upload preview"
                            className="w-20 h-20 object-cover rounded-lg border-2 border-purple-400 neon-purple"
                          />
                        </div>
                      )}
                    </div>
                  ) : field.type === "textarea" ? (
                    <Textarea
                      id={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      required={field.required}
                      placeholder={`Enter your ${field.label.toLowerCase()}...`}
                      className="glass text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter resize-none"
                      rows={3}
                    />
                  ) : (
                    <Input
                      type="text"
                      id={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      required={field.required}
                      placeholder={`Enter your ${field.label.toLowerCase()}...`}
                      className="glass text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter"
                    />
                  )}
                </div>
              ))}
              <Button
                onClick={handleGenerateClick} // Wired to new handler
                disabled={isGenerating}
                className={`relative w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 btn-interactive neon-purple py-4 text-lg font-semibold font-space ${isGenerating ? "ring-2 ring-white/60 ring-offset-2 ring-offset-purple-500/20" : ""}`}
              >
                {isGenerating ? (
                  <>
                    <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[hsl(var(--accent-blue))] to-[hsl(var(--accent-green))] opacity-20 blur-sm" />
                    <Loader2 className="relative w-5 h-5 mr-2 animate-spin" />
                    Creating Magic...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Let's Start the Magic
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Preview Section */}
          <Card className="glass p-8 animate-in fade-in-0 slide-in-from-right-4 duration-1000 delay-300">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2 font-space flex items-center">
                <Eye className="w-6 h-6 mr-2" />
                Poster Preview
              </h3>
              <p className="text-blue-200 font-inter">Your poster will look exactly like this.</p>
            </div>

            <div className="relative">
              {generatedPoster ? (
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] bg-white rounded-lg overflow-hidden border-2 border-purple-400 neon-purple">
                    <img
                      src={generatedPoster || "/placeholder.svg"}
                      alt="Generated poster"
                      className="w-full h-full object-cover"
                    />
                    {/* Blur overlay while awaiting payment */}
                    <AnimatePresence>
                      {posterStatus !== PosterStatus.COMPLETED && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.7 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="absolute inset-0 bg-black/30 backdrop-blur-[12px] flex items-center justify-center"
                        >
                          <div className="text-center px-6">
                            {/* Tiny confetti animation in background */}
                            <div className="absolute inset-0 pointer-events-none">
                              {[...Array(20)].map((_, i) => (
                                <motion.span
                                  key={i}
                                  className="absolute w-2 h-2 rounded-full"
                                  style={{
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`,
                                    backgroundColor: ["#22c55e", "#0ea5e9", "#7c3aed", "#f59e0b"][i % 4],
                                  }}
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.8, delay: i * 0.02 }}
                                />
                              ))}
                            </div>
                            <p className="relative z-10 text-white font-space text-lg mb-2">
                              Poster generated successfully! Proceed to payment.
                            </p>
                            <p className="relative z-10 text-blue-100 font-inter text-sm mb-4">
                              Pay KSh 1 to unlock your poster.
                            </p>
                            <Link href={`/payment/${sessionId}`} className="relative z-10">
                              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-3 font-space">
                                <Download className="w-5 h-5 mr-2" />
                                Pay KSh 1 to unlock
                              </Button>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="text-center">
                    {posterStatus === PosterStatus.COMPLETED ? (
                      <>
                        <div className="text-4xl mb-2">🎉</div>
                        <p className="text-green-400 font-bold font-space">Payment received. Poster unlocked!</p>
                        <p className="text-blue-200 text-sm font-inter">You can download your poster now.</p>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl mb-2">🔥</div>
                        <p className="text-yellow-300 font-bold font-space">Awaiting payment…</p>
                        <p className="text-blue-200 text-sm font-inter">Complete payment to reveal your poster.</p>
                      </>
                    )}
                  </div>

                  {posterStatus === PosterStatus.COMPLETED ? (
                    <Link href={`/download/${sessionId}`}>
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-3 font-space">
                        <Download className="w-5 h-5 mr-2" />
                        Download Poster
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/payment/${sessionId}`}>
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-3 font-space">
                        <Download className="w-5 h-5 mr-2" />
                        Pay KSh 1 to unlock
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-lg flex items-center justify-center border-2 border-dashed border-white/30 overflow-hidden">
                  {template.thumbnail_path ? (
                    <img
                      src={getThumbnailUrl(template.thumbnail_path)}
                      alt={template.template_name}
                      className="w-full h-full object-cover opacity-50"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <ImageIcon className="w-12 h-12 text-blue-300 mx-auto" />
                      <p className="text-blue-200 font-inter">Your poster will look exactly like this!</p>
                      <p className="text-sm text-blue-300 font-inter">Fill the form to see the magic</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
