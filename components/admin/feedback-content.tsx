"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter } from "lucide-react"
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
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "reviewed">("all")

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
        // Record a user-friendly error state without logging to console
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

  const handleStatusChange = (feedbackId: number, newStatus: "new" | "reviewed" | "featured" | "flagged") => {
    setFeedback((prev) => prev.map((item) => (item.id === feedbackId ? { ...item, status: newStatus } : item)))
  }

  const handleDelete = (feedbackId: number) => {
    setFeedback((prev) => prev.filter((item) => item.id !== feedbackId))
  }

  const filteredFeedback = feedback.filter((item) => {
    const matchesSearch =
      (item.comment || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.template_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.phone_number && item.phone_number.includes(searchTerm))

    const matchesStatus = filterStatus === "all" || item.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      new: { color: "bg-blue-500/20 text-blue-400 border-blue-400/30", label: "New" },
      reviewed: { color: "bg-green-500/20 text-green-400 border-green-400/30", label: "Reviewed" },
      featured: { color: "bg-purple-500/20 text-purple-400 border-purple-400/30", label: "Featured" },
      flagged: { color: "bg-red-500/20 text-red-400 border-red-400/30", label: "Flagged" },
    }

    const config = statusConfig[status] || statusConfig.new
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-400"
    if (rating >= 3) return "text-yellow-400"
    return "text-red-400"
  }

  const avgRating =
    feedback.length > 0 ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1) : "0"

  return (
    <div className="space-y-6 section-fade-in scroll-fade-in transition-smooth">
      <Card className="glass p-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white font-space mb-6">Feedback Management</h2>

        {/* Search and Filter Section */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search feedback by comment, phone, or template..."
              className="glass pl-10 text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-smooth font-inter h-11"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-300" />
              <span className="text-sm text-blue-200 font-inter">Filter:</span>
            </div>

            <Button
              onClick={() => setFilterStatus("all")}
              className={`text-sm px-4 py-2 rounded-full transition-smooth hover-subtle ${
                filterStatus === "all"
                  ? "bg-purple-500/50 text-white neon-purple"
                  : "glass bg-white/10 text-blue-200 hover:bg-white/20"
              }`}
            >
              All Feedback
            </Button>

            <Button
              onClick={() => setFilterStatus("new")}
              className={`text-sm px-4 py-2 rounded-full transition-smooth hover-subtle ${
                filterStatus === "new"
                  ? "bg-blue-500/50 text-white neon-blue"
                  : "glass bg-white/10 text-blue-200 hover:bg-white/20"
              }`}
            >
              New Feedback
            </Button>

            <Button
              onClick={() => setFilterStatus("reviewed")}
              className={`text-sm px-4 py-2 rounded-full transition-smooth hover-subtle ${
                filterStatus === "reviewed"
                  ? "bg-green-500/50 text-white neon-green"
                  : "glass bg-white/10 text-blue-200 hover:bg-white/20"
              }`}
            >
              Reviewed Feedback
            </Button>
          </div>
        </div>
      </Card>

      {/* Feedback Results Section */}
      <Card className="glass p-6 animate-fade-in">
        {isLoading ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
            <p className="text-blue-200 font-inter">Loading feedback…</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-red-300 mx-auto mb-4 opacity-60" />
            <h3 className="text-xl font-bold text-white font-space mb-2">Unable to Load Feedback</h3>
            <p className="text-blue-200 font-inter">{loadError}</p>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white font-space mb-2">No Feedback Found</h3>
            <p className="text-blue-200 font-inter">
              {searchTerm ? `No feedback matches "${searchTerm}"` : "No user feedback available yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-4 glass rounded-lg hover:neon-purple transition-smooth animate-in fade-in-0"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className={`font-bold font-space ${getRatingColor(item.rating)}`}>{item.rating}★</span>
                    <span className="text-xs text-blue-300 font-inter">{formatDate(item.created_at)}</span>
                  </div>
                  {item.template_name && (
                    <p className="text-sm text-blue-200 font-inter">Template: {item.template_name}</p>
                  )}
                  <p className="text-white font-inter leading-relaxed mt-1">{item.comment || "(no comment)"}</p>
                  {item.phone_number && (
                    <p className="text-xs text-blue-300 font-inter mt-1">Phone: {item.phone_number}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
