"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter } from "lucide-react"

interface FeedbackItem {
  id: number
  phoneNumber?: string
  rating: number
  comment: string
  templateUsed: string
  date: string
  status: "new" | "reviewed" | "featured" | "flagged"
  helpful: boolean
  posterPreview: string
}

export default function FeedbackContent() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([
    {
      id: 1,
      phoneNumber: "+254712345678",
      rating: 5,
      comment: "Amazing app! Very easy to use. I made my poster in less than 2 minutes!",
      templateUsed: "Biashara Boost",
      date: "2024-01-20",
      status: "new",
      helpful: true,
      posterPreview: "/placeholder.svg?height=80&width=120&text=Biashara+Boost",
    },
    {
      id: 2,
      rating: 4,
      comment: "Good app but the payment process could be faster. Overall satisfied.",
      templateUsed: "Sokoni Special",
      date: "2024-01-19",
      status: "reviewed",
      helpful: true,
      posterPreview: "/placeholder.svg?height=80&width=120&text=Sokoni+Special",
    },
    {
      id: 3,
      phoneNumber: "+254756789012",
      rating: 5,
      comment: "Perfect for my restaurant! Customers love the new posters. Asante sana!",
      templateUsed: "Food Fiesta",
      date: "2024-01-18",
      status: "featured",
      helpful: true,
      posterPreview: "/placeholder.svg?height=80&width=120&text=Food+Fiesta",
    },
    {
      id: 4,
      phoneNumber: "+254798765432",
      rating: 3,
      comment: "It's okay but I wish there were more template options.",
      templateUsed: "Tech Vibes",
      date: "2024-01-17",
      status: "reviewed",
      helpful: false,
      posterPreview: "/placeholder.svg?height=80&width=120&text=Tech+Vibes",
    },
    {
      id: 5,
      phoneNumber: "+254723456789",
      rating: 5,
      comment: "Hii app imeniokoa sana! Now I can make posters for my bundles business easily.",
      templateUsed: "Biashara Boost",
      date: "2024-01-16",
      status: "featured",
      helpful: true,
      posterPreview: "/placeholder.svg?height=80&width=120&text=Biashara+Boost",
    },
    {
      id: 6,
      rating: 2,
      comment: "App is slow and crashed twice. Not happy with the experience.",
      templateUsed: "Sokoni Special",
      date: "2024-01-15",
      status: "flagged",
      helpful: false,
      posterPreview: "/placeholder.svg?height=80&width=120&text=Sokoni+Special",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "reviewed">("all")

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
      item.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.templateUsed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.phoneNumber && item.phoneNumber.includes(searchTerm))

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
    <div className="space-y-6">
      <Card className="glass p-6 animate-in fade-in-0 slide-in-from-top-4 duration-1000">
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
              className="glass pl-10 text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter h-11"
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
              className={`text-sm px-4 py-2 rounded-full transition-all ${
                filterStatus === "all"
                  ? "bg-purple-500/50 text-white neon-purple"
                  : "glass bg-white/10 text-blue-200 hover:bg-white/20"
              }`}
            >
              All Feedback
            </Button>

            <Button
              onClick={() => setFilterStatus("new")}
              className={`text-sm px-4 py-2 rounded-full transition-all ${
                filterStatus === "new"
                  ? "bg-blue-500/50 text-white neon-blue"
                  : "glass bg-white/10 text-blue-200 hover:bg-white/20"
              }`}
            >
              New Feedback
            </Button>

            <Button
              onClick={() => setFilterStatus("reviewed")}
              className={`text-sm px-4 py-2 rounded-full transition-all ${
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
      <Card className="glass p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-200">
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white font-space mb-2">Feedback List</h3>
          <p className="text-blue-200 font-inter">
            {filterStatus === "all"
              ? "All user feedback will appear here"
              : filterStatus === "new"
                ? "New unreviewed feedback will appear here"
                : "Reviewed feedback will appear here"}
          </p>
          <p className="text-sm text-blue-300 font-inter mt-3">{searchTerm && `Searching for: "${searchTerm}"`}</p>
        </div>
      </Card>
    </div>
  )
}
