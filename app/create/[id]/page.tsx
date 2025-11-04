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
import { supabase, type PosterTemplate, showToast, testSupabaseConnection } from "@/lib/supabase"
import { sendToMakeWebhook, testMakeWebhook } from "@/lib/make-webhook"

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
  const [loadingMessage, setLoadingMessage] = useState("")
  const [sessionId, setSessionId] = useState("")

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
    console.log("🔍 Testing connections...")

    // Test Supabase
    const supabaseResult = await testSupabaseConnection()
    if (!supabaseResult.success) {
      setConnectionError(true)
      showToast(`Database connection failed: ${supabaseResult.error}`, "error")
    }

    // Test Make webhook
    const makeResult = await testMakeWebhook()
    if (!makeResult.success) {
      console.warn("⚠️ Make webhook test failed:", makeResult.error)
      showToast(`Make webhook may not be configured: ${makeResult.error}`, "error")
    }
  }

  const fetchTemplate = async () => {
    try {
      setLoading(true)
      setError("")

      console.log("📥 Fetching template with ID:", templateId)

      const { data, error } = await supabase.from("poster_templates").select("*").eq("template_id", templateId).single()

      if (error) {
        console.error("❌ Supabase error:", error)

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

      console.log("✅ Fetched template:", data)
      setTemplate(data)

      // Validate template structure
      if (!data.template_uuid) {
        console.warn("⚠️ Template missing template_uuid field")
        showToast("Template configuration issue: missing UUID", "error")
      }

      if (!data.fields_required || !Array.isArray(data.fields_required)) {
        console.warn("⚠️ Template missing or invalid fields_required")
        showToast("Template configuration issue: invalid fields", "error")
      }

      // Initialize form data with empty values
      const initialFormData: Record<string, any> = {}
      data.fields_required?.forEach((field) => {
        initialFormData[field.name] = field.type === "image" ? null : ""
      })
      setFormData(initialFormData)
    } catch (err: any) {
      console.error("❌ Error fetching template:", err)
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
      console.log("🚀 Starting poster generation...")

      // Create a record in generated_posters table - NO UNIQUE CONSTRAINTS
      // This allows users to retry with same data if previous attempt failed
      const { data: generatedPosterData, error: insertError } = await supabase
        .from("generated_posters")
        .insert({
          template_name: template.template_name,
          template_id: template.template_id,
          template_uuid: template.template_uuid,
          image_url: null, // Will be updated by Make webhook
          time: new Date().toISOString(),
          session_id: sessionId, // Ensure session_id is saved here
        })
        .select()
        .single()

      if (insertError) {
        console.error("❌ Error creating generated_posters record:", insertError)
        throw new Error(`Failed to create poster record: ${insertError.message}`)
      }

      console.log("✅ Created generated_posters record:", generatedPosterData)

      // Prepare webhook data with new JSON format
      const webhookPayload = {
        templateId: template.template_uuid || template.template_id, // Use template_uuid as primary, fallback to template_id
        fields: formData, // User form data as fields object
        session_id: sessionId,
        generated_poster_id: generatedPosterData.id,
        timestamp: new Date().toISOString(),
      }

      console.log("📡 Sending data to Make webhook with new format...")
      console.log("📦 Formatted payload:", JSON.stringify(webhookPayload, null, 2))

      // Send to Make webhook
      await sendToMakeWebhook(webhookPayload) // ⚡ your existing util

      console.log("✅ Webhook sent successfully")

      router.push(`/progress/${sessionId}`) // Redirect to progress page with session_id
    } catch (err: any) {
      console.error("❌ Generation failed:", err)
      showToast("Generation failed, try again.", "error")
      setError(err.message || "Failed to generate poster. Please try again.")
    } finally {
      clearInterval(messageInterval)
      setIsGenerating(false)
      setLoadingMessage("")
    }
  }

  const renderBase64Image = (base64: string) => {
    if (!base64) return "/placeholder.svg?height=400&width=600"
    return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
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
                  <Label htmlFor={field.name} className="text-white font-medium font-space flex items-center">
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
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 btn-interactive neon-purple py-4 text-lg font-semibold font-space"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
              {isGenerating ? (
                <div className="aspect-[4/3] bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex flex-col items-center justify-center space-y-4 animate-pulse">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-blue-400 border-b-transparent rounded-full animate-spin animate-reverse"></div>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-white font-bold text-lg font-space animate-pulse">{loadingMessage}</p>
                    <div className="flex space-x-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : generatedPoster ? (
                <div className="space-y-4">
                  <div className="aspect-[4/3] bg-white rounded-lg overflow-hidden border-2 border-purple-400 neon-purple">
                    <img
                      src={generatedPoster || "/placeholder.svg"}
                      alt="Generated poster"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="text-center">
                    <div className="text-4xl mb-2">🔥</div>
                    <p className="text-green-400 font-bold font-space">Poster Ready!</p>
                    <p className="text-blue-200 text-sm font-inter">Looking good, champ!</p>
                  </div>

                  {template.price === 0 ? (
                    <Link href={`/download/${sessionId}`}>
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-3 font-space">
                        <Download className="w-5 h-5 mr-2" />
                        Download Free
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/payment/${sessionId}`}>
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 btn-interactive neon-green py-3 font-space">
                        <Download className="w-5 h-5 mr-2" />
                        Pay & Download (KSh {template.price})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-lg flex items-center justify-center border-2 border-dashed border-white/30 overflow-hidden">
                  {template.thumbnail ? (
                    <img
                      src={renderBase64Image(template.thumbnail) || "/placeholder.svg"}
                      alt={template.template_name}
                      className="w-full h-full object-cover opacity-50"
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
