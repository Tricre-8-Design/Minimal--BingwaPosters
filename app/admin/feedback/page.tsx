"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  MessageSquare,
  Search,
  Star,
  Filter,
  Calendar,
  Phone,
  MessageCircle,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Eye,
} from "lucide-react"

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState([
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
  const [ratingFilter, setRatingFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`)
    }
  }

  const handleWhatsApp = (phoneNumber) => {
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/\D/g, "")
      window.open(`https://wa.me/${cleanNumber}`, "_blank")
    }
  }

  const handleStatusChange = (feedbackId, newStatus) => {
    setFeedback((prev) => prev.map((item) => (item.id === feedbackId ? { ...item, status: newStatus } : item)))
    // TODO: Update Supabase
  }

  const handleDelete = (feedbackId) => {
    setFeedback((prev) => prev.filter((item) => item.id !== feedbackId))
    // TODO: Delete from Supabase
  }

  const filteredFeedback = feedback.filter((item) => {
    const matchesSearch =
      item.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.templateUsed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.phoneNumber && item.phoneNumber.includes(searchTerm))

    const matchesRating = ratingFilter === "all" || item.rating.toString() === ratingFilter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter

    return matchesSearch && matchesRating && matchesStatus
  })

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      new: { color: "bg-blue-500/20 text-blue-400 border-blue-400/30", label: "New" },
      reviewed: { color: "bg-green-500/20 text-green-400 border-green-400/30", label: "Reviewed" },
      featured: { color: "bg-purple-500/20 text-purple-400 border-purple-400/30", label: "Featured" },
      flagged: { color: "bg-red-500/20 text-red-400 border-red-400/30", label: "Flagged" },
    }

    const config = statusConfig[status] || statusConfig.new
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getRatingColor = (rating) => {
    if (rating >= 4) return "text-green-400"
    if (rating >= 3) return "text-yellow-400"
    return "text-red-400"
  }

  const avgRating =
    feedback.length > 0 ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1) : 0

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass p-4 text-center hover:neon-blue transition-all duration-300 hover:scale-105">
          <div className="text-2xl font-bold text-white font-space">{feedback.length}</div>
          <div className="text-sm text-blue-200 font-inter">Total Feedback</div>
        </Card>
        <Card className="glass p-4 text-center hover:neon-green transition-all duration-300 hover:scale-105">
          <div className="text-2xl font-bold text-white font-space">{avgRating}</div>
          <div className="text-sm text-blue-200 font-inter">Avg Rating</div>
        </Card>
        <Card className="glass p-4 text-center hover:neon-purple transition-all duration-300 hover:scale-105">
          <div className="text-2xl font-bold text-white font-space">{feedback.filter((f) => f.rating >= 4).length}</div>
          <div className="text-sm text-blue-200 font-inter">4+ Stars</div>
        </Card>
        <Card className="glass p-4 text-center hover:neon-yellow transition-all duration-300 hover:scale-105">
          <div className="text-2xl font-bold text-white font-space">
            {feedback.filter((f) => f.status === "new").length}
          </div>
          <div className="text-sm text-blue-200 font-inter">Unreviewed</div>
        </Card>
        <Card className="glass p-4 text-center hover:neon-green transition-all duration-300 hover:scale-105">
          <div className="text-2xl font-bold text-white font-space">{feedback.filter((f) => f.helpful).length}</div>
          <div className="text-sm text-blue-200 font-inter">Helpful</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Rating Filter */}
            <div className="flex gap-2">
              {["all", "5", "4", "3", "2", "1"].map((rating) => (
                <Button
                  key={rating}
                  size="sm"
                  onClick={() => setRatingFilter(rating)}
                  className={`glass btn-interactive transition-all duration-300 ${
                    ratingFilter === rating
                      ? "neon-purple bg-purple-500/30 text-white"
                      : "text-blue-200 hover:text-white"
                  }`}
                >
                  {rating === "all" ? "All Ratings" : `${rating}★`}
                </Button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {["all", "new", "reviewed", "featured", "flagged"].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={`glass btn-interactive transition-all duration-300 capitalize ${
                    statusFilter === status ? "neon-blue bg-blue-500/30 text-white" : "text-blue-200 hover:text-white"
                  }`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {status}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search feedback..."
              className="glass pl-10 text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter"
            />
          </div>
        </div>
      </Card>

      {/* Feedback List */}
      <Card className="glass p-6">
        <div className="flex items-center space-x-3 mb-6">
          <MessageSquare className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white font-space">User Feedback ({filteredFeedback.length})</h2>
        </div>

        <div className="space-y-4">
          {filteredFeedback.map((item, index) => (
            <div
              key={item.id}
              className="glass p-6 rounded-lg hover:neon-purple transition-all duration-300 hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Poster Preview */}
                <div className="lg:col-span-2">
                  <img
                    src={item.posterPreview || "/placeholder.svg"}
                    alt={item.templateUsed}
                    className="w-full h-20 object-cover rounded border-2 border-purple-400/30"
                  />
                  <p className="text-blue-200 font-inter text-xs mt-1 text-center">{item.templateUsed}</p>
                </div>

                {/* Feedback Content */}
                <div className="lg:col-span-6">
                  <div className="space-y-3">
                    {/* Rating */}
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < item.rating ? "text-yellow-400 fill-current" : "text-gray-400"}`}
                          />
                        ))}
                      </div>
                      <span className={`font-bold font-space ${getRatingColor(item.rating)}`}>{item.rating}/5</span>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Comment */}
                    <blockquote className="text-white font-inter leading-relaxed">"{item.comment}"</blockquote>

                    {/* Meta Info */}
                    <div className="flex items-center space-x-4 text-sm text-blue-200">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                      {item.phoneNumber && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-4 h-4" />
                          <span>{item.phoneNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        {item.helpful ? (
                          <ThumbsUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <ThumbsDown className="w-4 h-4 text-red-400" />
                        )}
                        <span>{item.helpful ? "Helpful" : "Not Helpful"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="lg:col-span-4 flex justify-end">
                  <div className="flex space-x-2">
                    {item.phoneNumber && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleCall(item.phoneNumber)}
                          className="glass btn-interactive text-white hover:neon-green"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleWhatsApp(item.phoneNumber)}
                          className="glass btn-interactive text-white hover:neon-green"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="glass btn-interactive text-white hover:neon-blue">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="glass border-white/20 bg-slate-900/90 backdrop-blur-md">
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(item.id, "reviewed")}
                          className="text-white hover:bg-white/10 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-2 text-green-400" />
                          Mark as Reviewed
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(item.id, "featured")}
                          className="text-white hover:bg-white/10 cursor-pointer"
                        >
                          <Star className="w-4 h-4 mr-2 text-purple-400" />
                          Feature This
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(item.id, "flagged")}
                          className="text-white hover:bg-white/10 cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 mr-2 text-yellow-400" />
                          Flag for Review
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          className="text-white hover:bg-white/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2 text-red-400" />
                          Delete Feedback
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredFeedback.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-blue-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white font-space mb-2">No Feedback Found</h3>
            <p className="text-blue-200 font-inter">
              {searchTerm ? `No feedback matches "${searchTerm}"` : "No user feedback available yet."}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
