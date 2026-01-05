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

import { BackgroundWrapper } from "@/components/ui/background-wrapper"
import LoadingScreen from "@/components/loading-screen"

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
    return <LoadingScreen />
  }

  if (error) {
    return (
      <BackgroundWrapper className="flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 font-space">Can’t load templates</h2>
          <p className="text-text-secondary mb-4 font-inter">{error}</p>
          <div className="space-y-2">
            <Button
              onClick={() => fetchTemplates()}
              className="w-full bg-primary hover:bg-primary-hover text-white shadow-glowOrange"
            >
              <Zap className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Navigation */}
      <nav className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button
                size="icon"
                variant="outline"
                className="w-10 h-10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-white font-bold text-xl font-space drop-shadow-md">Bingwa Posters</span>
            </div>
          </div>

          <Button
            onClick={refreshTemplates}
            disabled={refreshing}
            className="bg-primary hover:bg-primary-hover text-white shadow-glowOrange transition-all duration-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </nav>

      {/* Header Section */}
      <section className="relative z-10 px-4 md:px-6 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 font-space drop-shadow-lg">
            Posters that pop. Without the drama.
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-4 font-inter drop-shadow-md">
            Skip design headaches. Ship standout posters in minutes.
          </p>

          <div className="h-8 md:h-9 relative overflow-hidden">
            <span
              key={messageIndex}
              className="absolute inset-0 flex items-center justify-center text-white/80 font-inter text-sm md:text-base animate-rotate-fade"
            >
              {rotatingMessages[messageIndex]}
            </span>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-white/30 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-xl border border-white/40 shadow-soft">
                <Search className="absolute left-3 text-text-muted w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search templates... (e.g., 'business', 'colorful')"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-6 border-none bg-transparent focus-visible:ring-0 text-text-primary placeholder:text-text-muted/70 w-full rounded-xl shadow-none hover:bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Controls */}
      <section className="relative z-10 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            {/* Category Filters */}
            <div className="relative w-full md:w-auto">
              <div className="flex flex-wrap md:flex-nowrap gap-2 overflow-x-auto no-scrollbar py-2 px-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-soft">
                {updatedCategories.map((category, index) => {
                  const Icon = category.icon
                  const isActive = selectedCategory === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`relative inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out border ${
                        isActive
                          ? "bg-white text-primary border-white shadow-lg scale-105"
                          : "bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/30"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mr-2 ${isActive ? "text-primary" : "text-white"}`} />
                      {category.name}
                      <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        isActive ? "bg-primary/10 text-primary" : "bg-white/20 text-white"
                      }`}>{category.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-soft">
              <Button
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`w-9 h-9 rounded-lg transition-all duration-300 ${viewMode === "grid" ? "bg-white text-primary shadow-sm" : "bg-transparent text-white hover:bg-white/20"}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                onClick={() => setViewMode("list")}
                className={`w-9 h-9 rounded-lg transition-all duration-300 ${viewMode === "list" ? "bg-white text-primary shadow-sm" : "bg-transparent text-white hover:bg-white/20"}`}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="relative z-10 px-4 md:px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white font-space drop-shadow-md">
              {selectedCategory === 'all' ? 'Latest Templates' : `${selectedCategory} Templates`}
            </h2>
            <p className="text-white/90 font-inter text-sm bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-soft">
              {filteredTemplates.length} result{filteredTemplates.length !== 1 ? "s" : ""}
            </p>
          </div>
          {filteredTemplates.length === 0 ? (
            <Card className="p-12 text-center animate-fadeUp">
              <div className="text-6xl mb-4">🤔</div>
              <h3 className="text-2xl font-bold text-text-primary mb-2 font-space">
                {templates.length === 0 ? "No Templates Available" : "Hakuna Template Hapa"}
              </h3>
              <p className="text-text-secondary mb-4 font-inter">
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
                  className="bg-primary hover:bg-primary-hover text-text-inverse"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={refreshTemplates}
                  disabled={refreshing}
                  className="bg-primary hover:bg-primary-hover text-text-inverse"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                {recentlyRefreshed && (
                  <Badge variant="outline" className="ml-3 bg-success-soft text-success-text border-border">
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
                  className="overflow-hidden transition-all duration-300 group cursor-pointer hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Top Section: Thumbnail */}
                  <div className="relative w-full bg-white">
                    <img
                      src={getThumbnailUrl(template.thumbnail_path ?? undefined)}
                      alt={template.template_name}
                      className="w-full h-auto object-contain rounded-t-xl border border-border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(template.template_name)}`
                      }}
                    />

                    {/* Template Tag Overlay */}
                    {template.tag && (
                      <span className="absolute top-2 right-2 bg-accent text-text-inverse text-xs px-2 py-1 rounded-full font-medium shadow-md">
                        {template.tag}
                      </span>
                    )}

                    {/* Hover View Overlay */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-primary/60 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer"
                      role="button"
                      aria-label={`View poster preview for ${template.template_name}`}
                      onClick={() => handlePreview(template)}
                    >
                      <div className="px-4 py-2 rounded-full bg-app-elevated text-text-primary text-sm font-medium shadow-md">
                        View Poster
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Info Panel */}
                  <div className="p-3 bg-app-elevated space-y-2 rounded-b-xl">
                    {/* Name and Price */}
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-base text-text-primary font-space line-clamp-1">
                        {template.template_name}
                      </h3>
                      <span className="px-2 py-1 bg-success text-text-inverse text-xs font-medium rounded-full whitespace-nowrap shadow-md">
                        KSh {template.price}
                      </span>
                    </div>

                    {/* Fields Count */}
                    <div className="text-sm text-text-secondary font-inter">
                      Fields: {template.fields_required?.length || 0}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between mt-2">
                      <Button
                        onClick={() => handlePreview(template)}
                        className="px-3 py-1 rounded-xl text-sm bg-accent hover:bg-accent-hover text-text-inverse shadow-sm"
                      >
                        Preview
                      </Button>
                      <Link href={`/create/${template.template_id}`}>
                        <Button className="px-3 py-1 rounded-xl text-sm bg-primary hover:bg-primary-hover text-text-inverse shadow-sm">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
          <Card className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn bg-surface/95 border-white/20 shadow-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-text-primary font-space">{previewTemplate.template_name}</h3>
              <Button
                size="icon"
                onClick={() => setPreviewTemplate(null)}
                className="bg-white/10 hover:bg-white/20 text-text-primary"
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
                  className="w-full h-auto rounded-lg border-2 border-white/20 shadow-soft"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(previewTemplate.template_name)}`
                  }}
                />
              </div>

              {/* Template Details */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-bold text-text-primary font-space mb-2">Description</h4>
                  <p className="text-text-secondary font-inter">{previewTemplate.description}</p>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-text-primary font-space mb-2">Required Fields</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.fields_required?.map((field) => (
                      <span
                        key={field.name}
                        className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full font-inter border border-primary/20"
                      >
                        {field.label} ({field.type})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Link href={`/create/${previewTemplate.template_id}`}>
                    <Button className="w-full bg-primary hover:bg-primary-hover text-white py-3 text-lg font-space shadow-glowOrange">
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
    </BackgroundWrapper>
  )
}
