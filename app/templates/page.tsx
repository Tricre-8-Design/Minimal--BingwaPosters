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
import { supabase, type PosterTemplate, getThumbnailUrl } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { friendlyToastError } from "@/lib/client-errors"

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
  const [updatedNotice, setUpdatedNotice] = useState(false)

  // Rotating benefit/pain-point messages for the header (short, punchy)
  const rotatingMessages = [
    "No designer? No problem.",
    "Save hours. Design fast.",
    "Brand-safe. Pixel-perfect.",
    "Templates that sell.",
    "Update your offers faster.",
    "Agents love this.",
  ]
  const [messageIndex, setMessageIndex] = useState(0)
  useEffect(() => {
    // Rotate messages every 4s with a fade in/out animation
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % rotatingMessages.length)
    }, 4000)
    return () => clearInterval(id)
  }, [rotatingMessages.length])

  const categories = [
    { id: "all", name: "All Templates", icon: Grid3X3, count: 0 },
    { id: "Data", name: "Data", icon: Smartphone, count: 0 },
    { id: "SMS", name: "SMS", icon: Coffee, count: 0 },
    { id: "Minutes", name: "Minutes", icon: Car, count: 0 },
    { id: "Special Offers", name: "Special Offers", icon: Briefcase, count: 0 },
    { id: "Others", name: "Others", icon: Home, count: 0 },
  ]

  // Fetch templates from Supabase
  useEffect(() => {
    fetchTemplates()

    // Removed legacy thumbnail verification

    // Set up real-time subscription for template changes
    const subscription = supabase
      .channel("template-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "poster_templates" },
        () => {
          setUpdatedNotice(true)
          setTimeout(() => setUpdatedNotice(false), 3000)
          fetchTemplates(false)
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "poster_templates" },
        () => {
          setUpdatedNotice(true)
          setTimeout(() => setUpdatedNotice(false), 3000)
          fetchTemplates(false)
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "poster_templates" },
        () => {
          setUpdatedNotice(true)
          setTimeout(() => setUpdatedNotice(false), 3000)
          fetchTemplates(false)
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setUpdatedNotice(false)
        }
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchTemplates = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      setError("")

      // Fetch templates from Supabase

      const { data, error } = await supabase
        .from("poster_templates")
        .select("*")
        .eq("is_active", true)
        .order("template_name")

      if (error) {
        throw new Error("We couldn’t load templates from the database.")
      }

      // Avoid noisy debug logging in UI; set templates directly

      setTemplates(data || [])

      // Keep success toasts minimal; no popouts here
    } catch (err: any) {
      const errorMessage = "Couldn’t load templates — please try again."
      setError(errorMessage)
      friendlyToastError(undefined, errorMessage)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const [recentlyRefreshed, setRecentlyRefreshed] = useState(false)
  const refreshTemplates = async () => {
    setRefreshing(true)
    await fetchTemplates(false)
    setRefreshing(false)
    // Replace noisy toast with subtle badge for a few seconds
    setRecentlyRefreshed(true)
    setTimeout(() => setRecentlyRefreshed(false), 3000)
  }

  // Filter templates based on search and category
  const filteredTemplates = templates.filter((template) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      template.template_name.toLowerCase().includes(term) ||
      (template.tag ?? "").toLowerCase().includes(term) ||
      template.category.toLowerCase().includes(term)

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
      <div className="min-h-screen site-gradient-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          {/* Ripple loader for template loading */}
          {/* Using a lightweight inline ripple with Tailwind and simple keyframes to avoid extra deps here */}
          <div className="relative mx-auto" style={{ width: 120, height: 120 }} aria-label="Loading templates">
            <span className="absolute inset-0 rounded-full border-4 border-purple-400/80 animate-[ping_1.6s_ease-out_infinite]" />
            <span className="absolute inset-0 rounded-full border-4 border-blue-400/80 animate-[ping_1.6s_ease-out_infinite]" style={{ transform: 'scale(0.7)' }} />
            <span className="absolute inset-0 rounded-full bg-purple-500/80" style={{ width: 16, height: 16, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: 9999 }} />
          </div>
          <p className="text-white font-space text-xl">Loading Posters...</p>
          <p className="text-blue-200 font-inter text-sm">Getting All Bingwa Posters...</p>
          {updatedNotice && (
            <span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-blue-100">Updated</span>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen site-gradient-bg flex items-center justify-center">
        <Card className="glass p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2 font-space">Can’t load templates</h2>
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
              Aii. Kuna kitu imefanyika. Check your internet connection as we check our side.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen site-gradient-bg relative overflow-hidden">
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
          {recentlyRefreshed && (
            <Badge variant="outline" className="ml-3 bg-white/10 text-white border-white/20">
              Updated
            </Badge>
          )}
        </div>
      </nav>

      {/* Header Section */}
      <section className="relative z-10 px-4 md:px-6 py-8 section-fade-in scroll-fade-in">
        <div className="max-w-7xl mx-auto text-center">
          {/* Humorous, engaging header + tagline */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 animate-in fade-in-0 slide-in-from-top-4 duration-1000 font-space">
            Posters that pop. Without the drama.
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-4 animate-in fade-in-0 slide-in-from-top-6 duration-1000 delay-200 font-inter">
            Skip design headaches. Ship standout posters in minutes.
          </p>

          {/* Rotating benefit/pain-point messages (accessible and readable on gradient) */}
          <div
            className="h-8 md:h-9 relative overflow-hidden"
            aria-live="polite"
            aria-atomic="true"
            aria-label="Rotating product benefits and pain-point solutions"
          >
            <span
              key={messageIndex}
              className="absolute inset-0 flex items-center justify-center text-blue-100 font-inter text-sm md:text-base animate-rotate-fade"
            >
              {rotatingMessages[messageIndex]}
            </span>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-300">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search templates... (e.g., 'business', 'colorful')"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search templates"
                className="glass pl-10 pr-4 py-3 text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Controls */}
      <section className="relative z-10 px-4 md:px-6 py-4 section-fade-in scroll-fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            {/* Category Filters */}
            <div className="relative w-full md:w-auto">
              <div className="flex flex-wrap md:flex-nowrap gap-2 overflow-x-auto no-scrollbar py-2 px-1 rounded-xl bg-white/5 backdrop-blur-sm shadow-soft">
                {updatedCategories.map((category, index) => {
                  const Icon = category.icon
                  const isActive = selectedCategory === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`relative inline-flex items-center rounded-full px-3 py-1.5 text-sm transition-all duration-300 ease-in-out ${
                        isActive
                          ? "text-white bg-[hsla(0,0%,100%,0.12)] shadow-soft"
                          : "text-blue-200 hover:text-white hover:bg-[hsla(0,0%,100%,0.08)]"
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {category.name}
                      <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isActive ? "bg-emerald-500/90 text-white" : "bg-white/10 text-blue-200"
                      }`}>{category.count}</span>
                      {/* Animated underline */}
                      <span
                        className={`absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full transition-all duration-300 ${
                          isActive ? "bg-gradient-to-r from-[hsl(var(--accent-blue))] to-[hsl(var(--accent-green))] opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
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
      <section className="relative z-10 px-4 md:px-6 pb-16 section-fade-in scroll-fade-in">
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
                {recentlyRefreshed && (
                  <Badge variant="outline" className="ml-3 bg-white/10 text-white border-white/20">
                    Updated
                  </Badge>
                )}
              </div>
            </Card>
          ) : (
            <div
              className={`grid gap-6 ${
                viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
              }`}
            >
              {filteredTemplates.map((template, index) => (
                <Card
                  key={template.template_id}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden transition-all duration-300 group cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 hover:scale-[1.02] hover:shadow-soft"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Top Section: Thumbnail */}
                  <div className="relative w-full bg-white">
                    <img
                      src={getThumbnailUrl(template.thumbnail_path ?? undefined)}
                      alt={template.template_name}
                      className="w-full h-auto object-contain rounded-t-xl border border-gray-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(template.template_name)}`
                      }}
                    />

                    {/* Template Tag Overlay */}
                    {template.tag && (
                      <span className="absolute top-2 right-2 bg-[hsl(var(--accent-blue))] text-white text-xs px-2 py-1 rounded-full font-medium shadow-soft">
                        {template.tag}
                      </span>
                    )}

                    {/* Hover View Overlay */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer"
                      role="button"
                      aria-label={`View poster preview for ${template.template_name}`}
                      onClick={() => handlePreview(template)}
                    >
                      <div className="px-4 py-2 rounded-full bg-white/80 text-neutral-800 text-sm font-medium shadow-soft">
                        View Poster
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Info Panel */}
                  <div className="p-3 bg-gradient-to-b from-blue-900/80 to-purple-900/80 space-y-2 rounded-b-xl">
                    {/* Name and Price */}
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-base text-white font-space line-clamp-1">
                        {template.template_name}
                      </h3>
                      <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full whitespace-nowrap shadow-soft">
                        KSh {template.price}
                      </span>
                    </div>

                    {/* Fields Count */}
                    <div className="text-sm text-blue-200 font-inter">
                      Fields: {template.fields_required?.length || 0}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between mt-2">
                      <Button
                        onClick={() => handlePreview(template)}
                        className="px-3 py-1 rounded-xl text-sm bg-[hsl(var(--accent-blue))] hover:brightness-105 text-white shadow-soft"
                      >
                        Preview
                      </Button>
                      <Link href={`/create/${template.template_id}`}>
                        <Button className="px-3 py-1 rounded-xl text-sm bg-purple-600 hover:bg-purple-700 text-white shadow-soft">
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
                  src={getThumbnailUrl(previewTemplate.thumbnail_path || "")}
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
