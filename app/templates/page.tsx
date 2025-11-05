"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
  ArrowLeft,
  Search,
  Grid3X3,
  List,
  Heart,
  Zap,
  Palette,
  Briefcase,
  Coffee,
  Car,
  Home,
  Smartphone,
  Loader2,
  RefreshCw,
  Eye,
  X,
} from "lucide-react"
import Link from "next/link"
import { supabase, type PosterTemplate, showToast, renderThumbnail, verifyThumbnailData } from "@/lib/supabase"

export default function TemplateGallery() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [viewMode, setViewMode] = useState("grid")
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set())
  const [templates, setTemplates] = useState<PosterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [previewTemplate, setPreviewTemplate] = useState<PosterTemplate | null>(null)

  const categories = [
    { id: "all", name: "All Templates", icon: Grid3X3, count: 0 },
    { id: "Data", name: "Data", icon: Smartphone, count: 0 },
    { id: "SMS", name: "SMS", icon: Coffee, count: 0 },
    { id: "Minutes", name: "Minutes", icon: Car, count: 0 },
    { id: "Announcements", name: "Announcements", icon: Briefcase, count: 0 },
    { id: "Others", name: "Others", icon: Home, count: 0 },
  ]

  // Fetch templates from Supabase
  useEffect(() => {
    fetchTemplates()

    // Verify thumbnail data on component mount
    verifyThumbnailData()

    // Set up real-time subscription for template changes
    const subscription = supabase
      .channel("template-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poster_templates",
        },
        (payload) => {
          console.log("Real-time template change detected:", payload)

          // Show notification for real-time updates
          if (payload.eventType === "INSERT") {
            showToast(`New template "${payload.new?.template_name}" added!`, "success")
          } else if (payload.eventType === "UPDATE") {
            showToast(`Template "${payload.new?.template_name}" updated!`, "success")
          } else if (payload.eventType === "DELETE") {
            showToast("Template deleted", "success")
          }

          // Refresh templates without loading state
          fetchTemplates(false)
        },
      )
      .subscribe((status) => {
        console.log("Real-time subscription status:", status)
        if (status === "SUBSCRIBED") {
          console.log("Real-time updates enabled for templates")
        } else if (status === "CHANNEL_ERROR") {
          console.error("Real-time subscription failed")
          showToast("Real-time updates unavailable", "error")
        }
      })

    return () => {
      console.log("Cleaning up real-time subscription")
      subscription.unsubscribe()
    }
  }, [])

  const fetchTemplates = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      setError("")

      console.log("Fetching templates from poster_templates table...")

      const { data, error } = await supabase.from("poster_templates").select("*").order("template_name")

      if (error) {
        console.error("Supabase error:", error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log("Fetched templates:", data)

      // Log thumbnail data for debugging
      data?.forEach((template) => {
        console.log(`Template: ${template.template_name}`)
        console.log(`- Has thumbnail: ${!!template.thumbnail}`)
        console.log(`- Thumbnail length: ${template.thumbnail?.length || 0}`)
        if (template.thumbnail && template.thumbnail.length < 100) {
          console.log(`- Thumbnail preview: ${template.thumbnail.substring(0, 50)}...`)
        }
      })

      setTemplates(data || [])

      if (data && data.length > 0 && showLoader) {
        showToast(`Loaded ${data.length} templates successfully!`, "success")
      }
    } catch (err: any) {
      console.error("Error fetching templates:", err)
      const errorMessage = err.message || "Failed to load templates. Please check your database connection."
      setError(errorMessage)
      showToast(errorMessage, "error")
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const refreshTemplates = async () => {
    setRefreshing(true)
    await fetchTemplates(false)
    setRefreshing(false)
    showToast("Templates refreshed!", "success")
  }

  // Filter templates based on search and category
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Update category counts
  const updatedCategories = categories.map((cat) => ({
    ...cat,
    count: cat.id === "all" ? templates.length : templates.filter((t) => t.category === cat.id).length,
  }))

  const toggleFavorite = (templateId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(templateId)) {
        newFavorites.delete(templateId)
      } else {
        newFavorites.add(templateId)
      }
      return newFavorites
    })
  }

  const handlePreview = (template: PosterTemplate) => {
    setPreviewTemplate(template)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
          <p className="text-white font-space text-xl">Loading Posters...</p>
          <p className="text-blue-200 font-inter text-sm">Getting All Bingwa Posters...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="glass p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-space">Database Connection Error</h2>
          <p className="text-blue-200 mb-4 font-inter">{error}</p>
          <div className="space-y-2">
            <Button
              onClick={() => fetchTemplates()}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 btn-interactive neon-purple"
            >
              <Zap className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <p className="text-xs text-blue-300 font-inter">
              Make sure the 'poster_templates' table exists in your Supabase database
            </p>
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/">
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
              <span className="text-white font-bold text-xl font-space">Bingwa Posters</span>
            </div>
          </div>

          <Button
            onClick={refreshTemplates}
            disabled={refreshing}
            className="glass btn-interactive text-white hover:neon-blue transition-all duration-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </nav>

      {/* Header Section */}
      <section className="relative z-10 px-4 md:px-6 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-in fade-in-0 slide-in-from-top-4 duration-1000 font-space">
            Choose. Customize. Earn Visibility.
          </h1>
          <p className="text-xl text-blue-200 mb-8 animate-in fade-in-0 slide-in-from-top-6 duration-1000 delay-200 font-inter">
            Pick a template that matches your need. Kila mtu ana style yake!
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-300">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search templates... (e.g., 'business', 'colorful')"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass pl-10 pr-4 py-3 text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Controls */}
      <section className="relative z-10 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {updatedCategories.map((category, index) => {
                const Icon = category.icon
                return (
                  <Button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`glass btn-interactive transition-all duration-300 animate-in fade-in-0 slide-in-from-left-4 duration-1000 ${
                      selectedCategory === category.id
                        ? "neon-purple bg-purple-500/30 text-white"
                        : "text-blue-200 hover:text-white hover:neon-blue"
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {category.name} ({category.count})
                  </Button>
                )
              })}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`glass btn-interactive transition-all duration-300 ${
                  viewMode === "grid" ? "neon-purple" : "hover:neon-blue"
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                onClick={() => setViewMode("list")}
                className={`glass btn-interactive transition-all duration-300 ${
                  viewMode === "list" ? "neon-purple" : "hover:neon-blue"
                }`}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-blue-200 font-inter">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} found
              {searchTerm && ` for "${searchTerm}"`}
              {selectedCategory !== "all" && ` in ${selectedCategory}`}
            </p>
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="relative z-10 px-4 md:px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {filteredTemplates.length === 0 ? (
            <Card className="glass p-12 text-center animate-in fade-in-0 zoom-in-95 duration-1000">
              <div className="text-6xl mb-4">🤔</div>
              <h3 className="text-2xl font-bold text-white mb-2 font-space">
                {templates.length === 0 ? "No Templates Available" : "Hakuna Template Hapa"}
              </h3>
              <p className="text-blue-200 mb-4 font-inter">
                {templates.length === 0
                  ? "No templates have been added yet. Check back later!"
                  : "Try a different search term or category. Ama check back later for more designs!"}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedCategory("all")
                  }}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 btn-interactive neon-purple"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={refreshTemplates}
                  disabled={refreshing}
                  className="glass btn-interactive text-white hover:neon-blue"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </Card>
          ) : (
            <div
              className={`grid gap-6 ${
                viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              }`}
            >
              {filteredTemplates.map((template, index) => (
                <Card
                  key={template.template_id}
                  className="glass p-6 hover:neon-purple transition-all duration-500 hover:scale-105 group cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4 duration-1000"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Template Image */}
                  <div className="relative mb-4 overflow-hidden rounded-lg">
                    <img
                      src={(() => {
                        // Enhanced thumbnail rendering with debugging
                        const thumbnail = template.thumbnail
                        console.log(`Rendering thumbnail for ${template.template_name || "/placeholder.svg"}:`, {
                          hasThumbnail: !!thumbnail,
                          thumbnailLength: thumbnail?.length || 0,
                          thumbnailType: typeof thumbnail,
                          thumbnailPreview: thumbnail ? thumbnail.substring(0, 50) + "..." : "null",
                        })

                        if (!thumbnail) {
                          console.log(`No thumbnail data for ${template.template_name}, using placeholder`)
                          return `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(template.template_name)}`
                        }

                        // If it's already a complete URL, return as is
                        if (
                          thumbnail.startsWith("http") ||
                          thumbnail.startsWith("data:") ||
                          thumbnail.startsWith("blob:") ||
                          thumbnail.startsWith("/")
                        ) {
                          console.log(`Using direct URL for ${template.template_name}`)
                          return thumbnail
                        }

                        // Try to handle as base64
                        try {
                          // Remove any whitespace and newlines
                          const cleanThumbnail = thumbnail.replace(/\s/g, "")

                          // Test if it's valid base64
                          atob(cleanThumbnail)
                          const dataUrl = `data:image/png;base64,${cleanThumbnail}`
                          console.log(`Successfully converted base64 for ${template.template_name}`)
                          return dataUrl
                        } catch (error) {
                          console.error(`Invalid base64 data for ${template.template_name}:`, error)
                          return `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(template.template_name)}`
                        }
                      })()}
                      alt={template.template_name}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        console.error(`Image failed to load for ${template.template_name}`)
                        console.error("Current src:", (e.target as HTMLImageElement).src)
                        console.error("Template data:", {
                          template_id: template.template_id,
                          thumbnail_length: template.thumbnail?.length || 0,
                          thumbnail_preview: template.thumbnail ? template.thumbnail.substring(0, 100) : "null",
                        })

                        const target = e.target as HTMLImageElement
                        // Fallback to a simple placeholder
                        target.src = `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(template.template_name)}`
                      }}
                      onLoad={() => {
                        console.log(`✅ Thumbnail loaded successfully for ${template.template_name}`)
                      }}
                    />

                    {/* Category Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-xs bg-purple-500/80 text-white rounded-full font-inter">
                        {template.category}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <Button
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(template.template_id)
                      }}
                      className={`absolute top-2 right-2 glass btn-interactive transition-all duration-300 ${
                        favorites.has(template.template_id)
                          ? "neon-purple text-pink-400"
                          : "text-white hover:text-pink-400"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${favorites.has(template.template_id) ? "fill-current" : ""}`} />
                    </Button>

                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <Button
                        onClick={() => handlePreview(template)}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 btn-interactive neon-blue"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="space-y-3">
                    {/* Name */}
                    <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300 font-space">
                      {template.template_name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-blue-200 font-inter line-clamp-2">{template.description}</p>

                    {/* Fields preview */}
                    <div className="flex flex-wrap gap-1">
                      {template.fields_required?.slice(0, 3).map((field) => (
                        <span
                          key={field.name}
                          className="px-2 py-1 text-xs bg-white/10 text-blue-200 rounded-full font-inter"
                        >
                          {field.label}
                        </span>
                      ))}

                      {template.fields_required && template.fields_required.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-white/10 text-blue-200 rounded-full font-inter">
                          +{template.fields_required.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handlePreview(template)}
                        className="flex-1 glass btn-interactive text-white hover:neon-blue font-space"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Link href={`/create/${template.template_id}`} className="flex-1">
                        <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 btn-interactive neon-purple font-space">
                          <Palette className="w-4 h-4 mr-2" />
                          Customize
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
          <Card className="glass p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-white font-space">{previewTemplate.template_name}</h3>
              <Button
                size="icon"
                onClick={() => setPreviewTemplate(null)}
                className="glass btn-interactive text-white hover:neon-purple"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Template Image */}
              <div className="w-full">
                <img
                  src={renderThumbnail(previewTemplate.thumbnail, previewTemplate.template_name) || "/placeholder.svg"}
                  alt={previewTemplate.template_name}
                  className="w-full h-auto rounded-lg border-2 border-purple-400/30"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(previewTemplate.template_name)}`
                  }}
                />
              </div>

              {/* Template Details */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-bold text-white font-space mb-2">Description</h4>
                  <p className="text-blue-200 font-inter">{previewTemplate.description}</p>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white font-space mb-2">Required Fields</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.fields_required?.map((field) => (
                      <span
                        key={field.name}
                        className="px-3 py-1 text-sm bg-purple-500/20 text-purple-300 rounded-full font-inter border border-purple-400/30"
                      >
                        {field.label} ({field.type})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Link href={`/create/${previewTemplate.template_id}`}>
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 btn-interactive neon-purple py-3 text-lg font-space">
                      <Palette className="w-5 h-5 mr-2" />
                      Start Customizing
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
