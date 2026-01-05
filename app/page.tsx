"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
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
import HeadlineRotator from "@/components/ui/headline-rotator"

import LoadingScreen from "@/components/loading-screen"
import { BackgroundWrapper } from "@/components/ui/background-wrapper"

export default function HomePage() {
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
  const [recentlyRefreshed, setRecentlyRefreshed] = useState(false)

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
    // Ensure loading screen shows for at least 3 seconds
    const minLoadTime = new Promise((resolve) => setTimeout(resolve, 3000))
    
    // Wrap fetch in a promise handling both data and minimum time
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([fetchTemplates(false), minLoadTime])
      } finally {
        setLoading(false)
      }
    }

    loadData()

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
          // Subtle notice instead of a toast
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
      <BackgroundWrapper className="flex items-center justify-center section-fade-in transition-smooth">
        <Card className="p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 font-space">Can’t load templates</h2>
          <p className="text-text-secondary mb-4 font-inter">{error}</p>
          <div className="space-y-2">
            <Button
              onClick={() => fetchTemplates()}
              className="w-full bg-primary hover:bg-primary-hover text-text-inverse"
            >
              <Zap className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <p className="text-xs text-text-muted font-inter">
              Ebu check your internet connection as we check on our side.
            </p>
          </div>
        </Card>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper className="section-fade-in scroll-fade-in transition-smooth">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 p-4 md:p-6 border-b border-white/10 bg-white/10 backdrop-blur-md transition-all duration-300 supports-[backdrop-filter]:bg-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 group cursor-pointer">
            <img
              src="/logo.svg"
              alt="Bingwa Posters Logo"
              className="w-12 h-12 object-contain rounded-xl shadow-lg group-hover:shadow-white/25 transition-all duration-300 group-hover:scale-105 backdrop-blur-sm"
            />
            <span className="text-white font-bold text-xl font-space tracking-tight transition-colors drop-shadow-md">Bingwa Posters</span>
          </div>

          <Button
            onClick={refreshTemplates}
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-soft"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {recentlyRefreshed && (
            <Badge variant="outline" className="ml-3 bg-white/20 text-white border-white/30 animate-in fade-in zoom-in backdrop-blur-sm">
              Updated
            </Badge>
          )}
        </div>
      </nav>

      {/* Header Section */}
      <section className="relative z-10 px-4 md:px-6 py-12 md:py-20 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-20">
          <HeadlineRotator
            phrases={[
              "Agents love this",
              "No designer? No problem",
              "Serious Bingwa Agents are here",
              "Save hours. Design fast.",
              "Update your offers faster.",
            ]}
            intervalMs={4000}
            className="text-5xl md:text-7xl mb-12 font-space font-extrabold tracking-tight text-white drop-shadow-lg"
          />
          <p className="text-xl md:text-2xl text-white/90 mb-10 animate-in fade-in-0 slide-in-from-top-6 duration-1000 delay-200 font-inter max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Pick a poster that matches your need. <span className="text-success font-bold">Kila mtu ana style yake!</span>
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-12 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-300">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-white/30 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-xl border border-white/40 shadow-soft">
                <Search className="absolute left-4 text-text-muted w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search templates... (e.g., 'weekend', 'minutes')"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-6 border-none bg-transparent focus-visible:ring-0 text-lg placeholder:text-text-muted/70 w-full rounded-xl text-text-primary shadow-none hover:bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Controls */}
      <section className="relative z-10 px-4 md:px-6 py-6 border-y border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Category Filters */}
            <div className="w-full md:w-auto overflow-x-auto no-scrollbar">
              <div className="flex gap-2 p-1">
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
                          : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40 backdrop-blur-sm"
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
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
            <div className="flex items-center gap-2 bg-white/10 p-1 rounded-xl border border-white/20 backdrop-blur-sm">
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
      <section className="relative z-10 px-4 md:px-6 pb-24 pt-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white font-space drop-shadow-md">
              {selectedCategory === 'all' ? 'Latest Templates' : `${selectedCategory} Templates`}
            </h2>
            <p className="text-white/90 font-inter text-sm bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
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
                  <h4 className="text-lg font-bold text-text-primary font-space mb-2">Tag</h4>
                  <p className="text-text-secondary font-inter">{previewTemplate.tag || "—"}</p>
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
