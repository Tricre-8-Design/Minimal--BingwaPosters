"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, ArrowLeft, Sparkles, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { supabase, type GeneratedPoster, showToast, testSupabaseConnection } from "@/lib/supabase"

export default function ProgressPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [poster, setPoster] = useState<GeneratedPoster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [connectionError, setConnectionError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!id) {
      setError("No poster ID provided")
      setLoading(false)
      return
    }

    console.log("🔍 Starting progress tracking for poster ID:", id)

    // Test connection first
    testConnection()

    // Initial fetch
    fetchPoster()

    // Set up real-time subscription
    let channel: any
    let pollInterval: NodeJS.Timeout

    try {
      console.log("📡 Setting up real-time subscription...")

      channel = supabase
        .channel(`poster-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "generated_posters",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            console.log("🔄 Real-time update received:", payload)
            const updatedPoster = payload.new as GeneratedPoster
            setPoster(updatedPoster)

            if (updatedPoster.image_url) {
              setLoading(false)
              showToast("Your poster is ready! 🎉", "success")
            }
          },
        )
        .subscribe((status) => {
          console.log("📡 Real-time subscription status:", status)
          if (status === "SUBSCRIBED") {
            console.log("✅ Successfully subscribed to real-time updates")
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Real-time subscription failed")
            setConnectionError(true)
          }
        })

      // Fallback polling in case real-time fails
      pollInterval = setInterval(async () => {
        if (!poster?.image_url) {
          console.log("🔄 Polling for poster updates...")
          await fetchPoster()
        } else {
          clearInterval(pollInterval)
        }
      }, 3000)
    } catch (err) {
      console.error("❌ Failed to set up real-time subscription:", err)
      setConnectionError(true)
    }

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up subscriptions...")
      if (channel) {
        channel.unsubscribe()
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [id, retryCount])

  const testConnection = async () => {
    const result = await testSupabaseConnection()
    if (!result.success) {
      setConnectionError(true)
      setError(`Database connection failed: ${result.error}`)
    }
  }

  const fetchPoster = async () => {
    try {
      console.log("📥 Fetching poster data for ID:", id)

      // fetchPoster – use template_uuid as unique key
      const { data, error } = await supabase
        .from("generated_posters")
        .select("*")
        .eq("template_uuid", id) // ← unique
        .order("time", { ascending: false }) // newest first
        .limit(1)
        .maybeSingle() // never throws

      if (error) {
        console.error("❌ Error fetching poster:", error)

        // Handle specific error cases
        if (error.code === "PGRST116") {
          throw new Error("Poster not found. It may have been deleted or the ID is incorrect.")
        } else if (error.message.includes('relation "generated_posters" does not exist')) {
          throw new Error("Database table 'generated_posters' does not exist. Please run the database setup script.")
        } else if (error.message.includes("permission denied")) {
          throw new Error("Permission denied. Please check your database RLS policies.")
        } else {
          throw new Error(`Database error: ${error.message}`)
        }
      }

      if (data) {
        console.log("✅ Poster data fetched:", data)
        setPoster(data)

        if (data.image_url) {
          setLoading(false)
          console.log("🎉 Poster is ready!")
        }
      }
    } catch (err: any) {
      console.error("❌ Fetch error:", err)
      setError(err.message || "Failed to load poster")
      setLoading(false)
      setConnectionError(true)
    }
  }

  const downloadImage = async (imageUrl: string) => {
    try {
      console.log("📥 Starting download:", imageUrl)

      // Validate URL
      if (!imageUrl || !imageUrl.startsWith("http")) {
        throw new Error("Invalid image URL")
      }

      const response = await fetch(imageUrl, {
        mode: "cors",
        headers: {
          Accept: "image/*",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `poster-${poster?.template_name || "design"}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast("Download started! 📥", "success")
    } catch (error: any) {
      console.error("❌ Download failed:", error)
      showToast(`Download failed: ${error.message}`, "error")
    }
  }

  const handleRetry = () => {
    setError("")
    setConnectionError(false)
    setLoading(true)
    setRetryCount((prev) => prev + 1)
  }

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="glass p-8 text-center max-w-md">
          <div className="text-4xl mb-4">{connectionError ? "🔌" : "😞"}</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-space">
            {connectionError ? "Connection Problem" : "Oops! Something went wrong"}
          </h2>
          <p className="text-blue-200 mb-4 font-inter">{error}</p>

          {connectionError && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-200">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-inter">Database connection issues detected</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleRetry}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 btn-interactive neon-blue"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link href="/templates">
              <Button className="w-full glass btn-interactive text-white hover:neon-purple">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
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
              <span className="text-white font-bold text-xl font-space">Poster Progress</span>
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

      <div className="relative z-10 px-4 md:px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          {loading || !poster?.image_url ? (
            // Loading State
            <Card className="glass p-12 text-center animate-pulse-glow">
              <div className="space-y-6">
                <div className="relative mx-auto w-24 h-24">
                  <div className="w-24 h-24 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-24 h-24 border-4 border-blue-400 border-b-transparent rounded-full animate-spin animate-reverse"></div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-white font-space">Hustling for your design…</h2>
                  <p className="text-blue-200 font-inter text-lg">
                    Our AI is working its magic. This usually takes 30-60 seconds.
                  </p>

                  <div className="flex justify-center space-x-1 mt-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      ></div>
                    ))}
                  </div>
                </div>

                {poster && (
                  <div className="mt-6 p-4 bg-white/10 rounded-lg">
                    <p className="text-sm text-blue-200 font-inter">
                      Template: <span className="text-white font-semibold">{poster.template_name}</span>
                    </p>
                    <p className="text-xs text-blue-300 font-inter mt-1">ID: {poster.id}</p>
                  </div>
                )}

                <div className="text-xs text-blue-300 font-inter">
                  <p>Real-time updates: {connectionError ? "❌ Offline" : "✅ Connected"}</p>
                  <p>Retry count: {retryCount}</p>
                </div>
              </div>
            </Card>
          ) : (
            // Success State
            <Card className="glass p-8 animate-fade-in">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-white mb-2 font-space">Your Poster is Ready!</h2>
                <p className="text-blue-200 font-inter text-lg">Looking absolutely stunning! Ready to download?</p>
              </div>

              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl border-2 border-purple-400 neon-purple">
                  <img
                    src={poster.image_url || "/placeholder.svg?height=600&width=800"}
                    alt="Generated Poster"
                    className="w-full rounded-2xl animate-fade-in"
                    onLoad={() => console.log("✅ Image loaded successfully")}
                    onError={(e) => {
                      console.error("❌ Image failed to load:", e)
                      showToast("Image failed to load. Please try refreshing.", "error")
                    }}
                  />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-white font-space">{poster.template_name}</h3>
                  <p className="text-blue-200 font-inter text-sm">
                    Generated on {new Date(poster.time).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-blue-300 font-inter">Template UUID: {poster.template_uuid}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={() => downloadImage(poster.image_url!)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:shadow-lg hover:shadow-green-500/50 btn-interactive py-4 text-lg font-semibold font-space transition-all duration-300"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download High Quality
                  </Button>

                  <Link href="/templates" className="flex-1">
                    <Button className="w-full glass btn-interactive text-white hover:neon-blue py-4 text-lg font-space">
                      Create Another
                    </Button>
                  </Link>
                </div>

                <div className="text-center">
                  <p className="text-sm text-blue-300 font-inter">Love your poster? Share it with the world! 🌟</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
