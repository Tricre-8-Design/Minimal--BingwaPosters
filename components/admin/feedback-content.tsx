"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Filter, Phone, MessageCircle, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface FeedbackItem {
  id: string | number
  phone_number?: string
  rating: number
  comment: string | null
  template_name?: string | null
  created_at: string
}

export default function FeedbackContent() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "high" | "low">("all")

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        const { data, error } = await supabase
          .from("feedback")
          .select("id, phone_number, rating, comment, template_name, created_at")
          .order("created_at", { ascending: false })
        if (error) throw error
        setFeedback(
          (data || []).map((f: any) => ({
            id: f.id,
            phone_number: f.phone_number || "",
            rating: f.rating || 0,
            comment: f.comment || null,
            template_name: f.template_name || null,
            created_at: f.created_at || new Date().toISOString(),
          })),
        )
      } catch (err: any) {
        setLoadError("Failed to load feedback. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    loadFeedback()

    const channel = supabase
      .channel("feedback-changes-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => loadFeedback())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCall = (phoneNumber?: string) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`)
    }
  }

  const handleWhatsApp = (phoneNumber?: string) => {
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/\D/g, "")
      window.open(`https://wa.me/${cleanNumber}`, "_blank")
    }
  }

  const handleDelete = async (feedbackId: string | number) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return

    try {
      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", feedbackId)

      if (error) throw error

      setFeedback((prev) => prev.filter((item) => item.id !== feedbackId))
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete feedback. Please try again.")
    }
  }

  const filteredFeedback = feedback.filter((item) => {
    const matchesSearch =
      (item.comment || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.template_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.phone_number && item.phone_number.includes(searchTerm))

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "high" && item.rating >= 4) ||
      (filterStatus === "low" && item.rating < 3)

    return matchesSearch && matchesFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-400"
    if (rating >= 3) return "text-yellow-400"
    return "text-red-400"
  }

  const avgRating =
    feedback.length > 0 ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-2 border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Feedback Management</h2>
            <p className="text-sm text-zinc-400 mt-1">Total: {feedback.length} • Average: {avgRating}★</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search feedback by comment, phone, or template..."
              className="bg-zinc-800 border-zinc-700 pl-10 text-white placeholder-zinc-500 focus:border-[#2595df] focus:ring-[#2595df] h-11"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Filter:</span>
            </div>

            <Button
              onClick={() => setFilterStatus("all")}
              className={`text-sm px-4 py-2 rounded-lg transition-all ${filterStatus === "all"
                  ? "bg-[#2595df] text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
            >
              All Feedback
            </Button>

            <Button
              onClick={() => setFilterStatus("high")}
              className={`text-sm px-4 py-2 rounded-lg transition-all ${filterStatus === "high"
                  ? "bg-green-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
            >
              High Ratings (4-5★)
            </Button>

            <Button
              onClick={() => setFilterStatus("low")}
              className={`text-sm px-4 py-2 rounded-lg transition-all ${filterStatus === "low"
                  ? "bg-red-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
            >
              Low Ratings (1-2★)
            </Button>
          </div>
        </div>
      </Card>

      {/* Feedback Results Section */}
      <Card className="bg-zinc-900 border-2 border-zinc-800 p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Loading feedback…</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Unable to Load Feedback</h3>
            <p className="text-zinc-400">{loadError}</p>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Feedback Found</h3>
            <p className="text-zinc-400">
              {searchTerm ? `No feedback matches "${searchTerm}"` : "No user feedback available yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-5 bg-zinc-800 border border-zinc-700 rounded-xl hover:border-[#2595df] transition-all duration-300"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`font-bold text-lg ${getRatingColor(item.rating)}`}>{item.rating}★</span>
                    <span className="text-xs text-zinc-400">{formatDate(item.created_at)}</span>
                  </div>
                  {item.template_name && (
                    <p className="text-sm text-zinc-300 mb-1">
                      <span className="text-zinc-500">Template:</span> {item.template_name}
                    </p>
                  )}
                  <p className="text-white leading-relaxed mb-2">{item.comment || "(no comment)"}</p>
                  {item.phone_number && (
                    <p className="text-xs text-zinc-400">
                      <span className="text-zinc-500">Phone:</span> {item.phone_number}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                  <Button
                    onClick={() => handleWhatsApp(item.phone_number)}
                    disabled={!item.phone_number}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Message on WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">WhatsApp</span>
                  </Button>

                  <Button
                    onClick={() => handleCall(item.phone_number)}
                    disabled={!item.phone_number}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Call"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">Call</span>
                  </Button>

                  <Button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-all flex items-center gap-2"
                    title="Delete feedback"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
