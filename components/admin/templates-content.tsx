"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Edit, Save, X, Upload, ImageIcon, Download } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabaseAdmin, type PosterTemplate, showToast, getThumbnailUrl } from "@/lib/supabase"
import RippleLoader from "@/components/ui/ripple-loader"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { extractFieldsFromBlueprint, type ExtractedField } from "@/lib/ai-blueprint-parser"

interface FieldRequirement {
  name: string
  label: string
  type: "text" | "textarea" | "image"
  required: boolean
  json_path?: string
}

export default function TemplatesContent() {
  const [templates, setTemplates] = useState<PosterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<PosterTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [engineFilter, setEngineFilter] = useState<"all" | "placid" | "ai" | "staging">("all")
  const [stagingTemplates, setStagingTemplates] = useState<any[]>([])

  // Import from Placid modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [placidTemplates, setPlacidTemplates] = useState<any[]>([])
  const [loadingPlacidTemplates, setLoadingPlacidTemplates] = useState(false)
  const [importingSingle, setImportingSingle] = useState<string | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [importMode, setImportMode] = useState<"all" | "single">("all")
  const [singleUUID, setSingleUUID] = useState("")

  // Form state
  // Form state
  const [formData, setFormData] = useState({
    template_name: "",
    template_id: "",
    template_uuid: "",
    engine_type: "placid" as "placid" | "ai",
    ai_prompt: "",
    price: 0,
    tag: "",
    category: "",
    thumbnail_path: "",
    poster_reference: "",
    fields_required: [] as FieldRequirement[],
  })

  // Derived AI fields from blueprint (auto-extracted)
  const [derivedAIFields, setDerivedAIFields] = useState<ExtractedField[]>([])
  const [blueprintError, setBlueprintError] = useState<string>("")


  useEffect(() => {
    fetchTemplates()
    // Subscribe to realtime changes in poster_templates
    const channel = supabaseAdmin
      .channel("realtime:poster_templates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "poster_templates" },
        (payload: any) => {
          const newTemplate = payload.new as PosterTemplate
          setTemplates((prev) => {
            const next = prev.filter((t) => t.template_id !== newTemplate.template_id).concat(newTemplate)
            return next.sort((a, b) => a.template_name.localeCompare(b.template_name))
          })
          showToast("New template added (realtime)", "success")
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "poster_templates" },
        (payload: any) => {
          const updated = payload.new as PosterTemplate
          setTemplates((prev) =>
            prev.map((t) => (t.template_id === updated.template_id ? { ...t, ...updated } : t)),
          )
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "poster_templates" },
        (payload: any) => {
          const removed = payload.old as PosterTemplate
          setTemplates((prev) => prev.filter((t) => t.template_id !== removed.template_id))
        },
      )
      .subscribe()

    return () => {
      try {
        supabaseAdmin.removeChannel(channel)
      } catch { }
    }
  }, [])

  // Auto-extract fields from AI blueprint when ai_prompt changes
  useEffect(() => {
    if (formData.engine_type !== "ai" || !formData.ai_prompt) {
      setDerivedAIFields([])
      setBlueprintError("")
      return
    }

    try {
      const parsed = JSON.parse(formData.ai_prompt)
      const fields = extractFieldsFromBlueprint(parsed)
      setDerivedAIFields(fields)
      setBlueprintError("")

      // Auto-sync to fields_required for backward compatibility
      const convertedFields: FieldRequirement[] = fields.map(f => ({
        name: f.field_key,
        label: f.label,
        type: f.input_type,
        required: f.required,
      }))
      setFormData(prev => ({ ...prev, fields_required: convertedFields }))
    } catch (err: any) {
      setBlueprintError(err.message || "Invalid JSON blueprint")
      setDerivedAIFields([])
    }
  }, [formData.ai_prompt, formData.engine_type])


  const fetchTemplates = async () => {
    try {
      setLoading(true)

      // Fetch regular templates
      const { data, error } = await supabaseAdmin.from("poster_templates").select("*").order("template_name")
      if (error) throw error
      setTemplates(data || [])

      // Fetch staging templates
      const { data: stagingData, error: stagingError } = await supabaseAdmin
        .from("placid_template_staging")
        .select("*")
        .eq("status", "pending")
        .order("placid_name")

      console.log("Staging query result:", { stagingData, stagingError })

      if (stagingError) {
        console.error("Failed to fetch staging templates:", stagingError)
      } else {
        console.log(`Setting ${stagingData?.length || 0} staging templates`)
        setStagingTemplates(stagingData || [])
      }
    } catch (error: any) {
      showToast(`Failed to fetch templates: ${error.message}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const refreshTemplates = async () => {
    try {
      setRefreshing(true)

      // Fetch regular templates
      const { data, error } = await supabaseAdmin.from("poster_templates").select("*").order("template_name")
      if (error) throw error
      setTemplates(data || [])

      // Fetch staging templates
      const { data: stagingData, error: stagingError } = await supabaseAdmin
        .from("placid_template_staging")
        .select("*")
        .eq("status", "pending")
        .order("placid_name")

      console.log("Refresh - Staging query:", { stagingData, stagingError })

      if (stagingError) {
        console.error("Failed to refresh staging templates:", stagingError)
      } else {
        console.log(`Refresh - Setting ${stagingData?.length || 0} staging templates`)
        setStagingTemplates(stagingData || [])
      }

      showToast("Templates refreshed successfully", "success")
    } catch (error: any) {
      showToast(`Failed to refresh templates: ${error.message}`, "error")
    } finally {
      setRefreshing(false)
    }
  }

  // Generate next template ID based on engine type
  const generateNextTemplateId = async (engineType: "placid" | "ai"): Promise<string> => {
    try {
      const prefix = engineType === "ai" ? "AI_W" : "Temp"
      const pattern = engineType === "ai" ? "AI_W%" : "Temp%"

      // Query templates with the matching prefix
      const { data, error } = await supabaseAdmin
        .from("poster_templates")
        .select("template_id")
        .like("template_id", pattern)
        .order("template_id", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Error fetching last template ID:", error)
        return engineType === "ai" ? "AI_W001" : "Temp001"
      }

      if (!data || data.length === 0) {
        // No existing templates with this prefix
        return engineType === "ai" ? "AI_W001" : "Temp001"
      }

      // Extract number from last template ID
      const lastId = data[0].template_id
      const numberMatch = lastId.match(/\d+$/)

      if (!numberMatch) {
        return engineType === "ai" ? "AI_W001" : "Temp001"
      }

      const lastNumber = parseInt(numberMatch[0], 10)
      const nextNumber = lastNumber + 1
      const paddedNumber = nextNumber.toString().padStart(3, "0")

      return `${prefix}${paddedNumber}`
    } catch (error) {
      console.error("Error generating template ID:", error)
      return engineType === "ai" ? "AI_W001" : "Temp001"
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.template_name || !formData.template_id || !formData.category) {
        showToast("Please fill in all required fields", "error")
        return
      }

      // Validate based on engine type
      if (formData.engine_type === "placid" && !formData.template_uuid) {
        showToast("Placid templates require a Template UUID", "error")
        return
      }

      let parsedAiPrompt = null
      if (formData.engine_type === "ai") {
        if (!formData.ai_prompt) {
          showToast("AI templates require a Blueprint JSON", "error")
          return
        }
        try {
          parsedAiPrompt = JSON.parse(formData.ai_prompt)
        } catch (e) {
          showToast("Invalid JSON in AI Poster Blueprint", "error")
          return
        }

        // Fields are auto-generated from blueprint, no manual json_path needed
      }

      const templateData = {
        ...formData,
        template_uuid: formData.engine_type === "ai" ? null : formData.template_uuid,
        ai_prompt: parsedAiPrompt,
        fields_required: formData.fields_required,
        poster_reference: formData.engine_type === "ai" ? formData.poster_reference : null,
      }

      // Check if this is a staging template being published
      const isStaging = editingTemplate?.is_staging === true
      const stagingId = editingTemplate?.staging_id

      if (isStaging && stagingId) {
        // PUBLISHING FROM STAGING
        console.log("Publishing staged template:", stagingId)

        // Insert into poster_templates
        const { error: insertError } = await supabaseAdmin
          .from("poster_templates")
          .insert([{ ...templateData, is_active: true }])

        if (insertError) throw insertError

        // Mark staging template as completed
        const { error: updateError } = await supabaseAdmin
          .from("placid_template_staging")
          .update({ status: "completed" })
          .eq("id", stagingId)

        if (updateError) {
          console.error("Failed to update staging status:", updateError)
        }

        showToast(`Template "${formData.template_name}" published successfully!`, "success")

        // Reset form and refresh
        resetForm()
        fetchTemplates()

      } else if (editingTemplate) {
        // Update existing template
        const { error } = await supabaseAdmin
          .from("poster_templates")
          .update(templateData)
          .eq("template_id", editingTemplate.template_id)

        if (error) throw error
        showToast("Template updated successfully!", "success")

        // Reset form and refresh
        resetForm()
        fetchTemplates()
      } else {
        // Create new template
        const { error } = await supabaseAdmin
          .from("poster_templates")
          .insert([{ ...templateData, is_active: true }])

        if (error) throw error
        showToast("Template created successfully!", "success")

        // Reset form and refresh
        resetForm()
        fetchTemplates()
      }

    } catch (error: any) {
      showToast(`Failed to save template: ${error.message}`, "error")
      console.error("Save error:", error)
    }
  }

  // Toggle activation state with confirmation on deactivation
  const handleToggleActive = async (template: PosterTemplate) => {
    try {
      const currentState = !!template.is_active
      if (currentState) {
        const confirmed = window.confirm(
          "Are you sure you want to deactivate this template? It will be hidden from all users.",
        )
        if (!confirmed) return
      }

      const { error } = await supabaseAdmin
        .from("poster_templates")
        .update({ is_active: !currentState })
        .eq("template_id", template.template_id)

      if (error) throw error

      // Update local state so UI reflects immediately
      setTemplates((prev) =>
        prev.map((t) => (t.template_id === template.template_id ? { ...t, is_active: !currentState } : t)),
      )

      showToast(
        !currentState ? "Template activated and visible to users." : "Template deactivated and hidden from users.",
        "success",
      )
    } catch (err: any) {
      // Silent failure; surface via toast only
      showToast(`Failed to update active state: ${err.message}`, "error")
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      const { error } = await supabaseAdmin.from("poster_templates").delete().eq("template_id", templateId)

      if (error) throw error
      showToast("Template deleted successfully!", "success")
      fetchTemplates()
    } catch (error: any) {
      // Silent failure; surface via toast only
      showToast(`Failed to delete template: ${error.message}`, "error")
    }
  }

  const handleEdit = (template: PosterTemplate) => {
    setEditingTemplate(template)
    setFormData({
      template_name: template.template_name,
      template_id: template.template_id,
      template_uuid: template.template_uuid || "",
      engine_type: template.engine_type || "placid",
      ai_prompt: template.ai_prompt ? JSON.stringify(template.ai_prompt, null, 2) : "",
      price: template.price,
      tag: template.tag || "",
      category: template.category,
      thumbnail_path: template.thumbnail_path || "",
      poster_reference: template.poster_reference || "",
      fields_required: template.fields_required || [],
    })
    setIsCreating(true)
  }

  const resetForm = () => {
    setFormData({
      template_name: "",
      template_id: "",
      template_uuid: "",
      engine_type: "placid",
      ai_prompt: "",
      price: 0,
      tag: "",
      category: "",
      thumbnail_path: "",
      poster_reference: "",
      fields_required: [],
    })
    setEditingTemplate(null)
    setIsCreating(false)
  }

  const addField = () => {
    setFormData((prev) => ({
      ...prev,
      fields_required: [...prev.fields_required, { name: "", label: "", type: "text", required: true }],
    }))
  }

  const updateField = (index: number, field: Partial<FieldRequirement>) => {
    setFormData((prev) => ({
      ...prev,
      fields_required: prev.fields_required.map((f, i) => (i === index ? { ...f, ...field } : f)),
    }))
  }

  const removeField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fields_required: prev.fields_required.filter((_, i) => i !== index),
    }))
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image file size must be less than 5MB", "error")
      return
    }

    try {
      setUploadingThumbnail(true)
      const ext = file.name.split(".").pop() || "png"
      const fileName = `${formData.template_id || "new"}-${Date.now()}.${ext}`

      // Upload to 'templates_thumbnails' bucket
      const { data, error } = await supabaseAdmin.storage
        .from("templates_thumbnails")
        .upload(`thumbnails/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        // Silent failure; surface via toast only
        console.error("Upload error:", error)
        showToast(`Thumbnail upload failed: ${error.message}`, "error")
        return
      }

      // Get public URL immediately
      const { data: publicData } = supabaseAdmin.storage
        .from("templates_thumbnails")
        .getPublicUrl(`thumbnails/${fileName}`)

      const uploadedUrl = publicData.publicUrl

      setFormData((prev) => ({
        ...prev,
        thumbnail_path: uploadedUrl,
      }))

      showToast("Thumbnail uploaded and link prefilled!", "success")

    } catch (error: any) {
      showToast(`Thumbnail upload failed: ${error.message}`, "error")
    } finally {
      setUploadingThumbnail(false)
    }
  }

  // New handler for AI Reference Image
  const handleAIReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error")
      return
    }

    try {
      // Create a specific loading state if needed, or re-use existing
      // We'll re-use uploadingThumbnail for now UI-wise or assume fast upload
      setUploadingThumbnail(true)

      const ext = file.name.split(".").pop() || "png"
      const fileName = `ref-${formData.template_id || "new"}-${Date.now()}.${ext}`

      // Upload to 'ai_thumbnails_refrences' bucket
      const { data, error } = await supabaseAdmin.storage
        .from("ai_thumbnails_refrences")
        .upload(`${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        showToast(`Reference upload failed: ${error.message}`, "error")
        return
      }

      // Get public URL
      const { data: publicData } = supabaseAdmin.storage
        .from("ai_thumbnails_refrences")
        .getPublicUrl(`${fileName}`)

      const uploadedUrl = publicData.publicUrl

      setFormData((prev) => ({
        ...prev,
        poster_reference: uploadedUrl,
      }))

      showToast("Reference poster uploaded successfully!", "success")

    } catch (error: any) {
      showToast(`Reference upload failed: ${error.message}`, "error")
    } finally {
      setUploadingThumbnail(false)
    }
  }

  const clearThumbnail = () => {
    setFormData((prev) => ({
      ...prev,
      thumbnail_path: "",
    }))
  }

  // Fetch Placid templates for import modal
  const fetchPlacidTemplates = async () => {
    try {
      setLoadingPlacidTemplates(true)
      setPlacidTemplates([]) // Clear previous data

      const response = await fetch("/api/admin/placid/templates")
      const data = await response.json()

      if (response.ok) {
        // Backend returns { templates: [...], total: ..., ... }
        let templatesList = []

        if (data.templates && Array.isArray(data.templates)) {
          // Normalize field names: title → name, thumbnail → thumbnail_url
          templatesList = data.templates.map((template: any) => ({
            ...template,
            name: template.title || template.name || "Untitled Template",
            thumbnail_url: template.thumbnail || template.thumbnail_url,
          }))
        } else if (Array.isArray(data)) {
          // Fallback if data is array directly
          templatesList = data.map((template: any) => ({
            ...template,
            name: template.title || template.name || "Untitled Template",
            thumbnail_url: template.thumbnail || template.thumbnail_url,
          }))
        } else {
          console.warn("Unexpected data format:", data)
          templatesList = []
        }

        console.log("Fetched templates:", templatesList)
        setPlacidTemplates(templatesList)

        // Select all templates by default
        const allUUIDs = new Set(templatesList.map((t: any) => t.uuid))
        setSelectedTemplates(allUUIDs)

        if (templatesList.length === 0) {
          showToast("No templates found in your Placid account", "error")
        } else {
          showToast(`Found ${templatesList.length} template(s) from Placid`, "success")
        }
      } else {
        setPlacidTemplates([]) // Ensure it's an array even on error
        showToast(data.error || "Failed to fetch Placid templates", "error")
        console.error("API Error:", data)
      }
    } catch (error: any) {
      setPlacidTemplates([]) // Ensure it's an array even on error
      showToast(`Failed to fetch Placid templates: ${error.message}`, "error")
      console.error("Fetch error:", error)
    } finally {
      setLoadingPlacidTemplates(false)
    }
  }

  // Fetch single template by UUID
  const fetchSingleTemplate = async () => {
    try {
      if (!singleUUID.trim()) {
        showToast("Please enter a template UUID", "error")
        return
      }

      setLoadingPlacidTemplates(true)
      console.log("Fetching single template:", singleUUID)

      const response = await fetch(`/api/admin/placid/templates/${singleUUID.trim()}`)
      const data = await response.json()

      console.log("Single template response:", data)

      if (response.ok && data.success) {
        const template = data.template

        // Normalize field names
        const normalizedTemplate = {
          ...template,
          name: template.title || template.name || "Untitled Template",
          thumbnail_url: template.thumbnail || template.thumbnail_url,
        }

        setPlacidTemplates([normalizedTemplate])
        setSelectedTemplates(new Set([template.uuid]))
        showToast("Template fetched successfully", "success")
      } else {
        showToast(data.error || "Failed to fetch template", "error")
        setPlacidTemplates([])
      }
    } catch (error: any) {
      showToast(`Failed to fetch template: ${error.message}`, "error")
      setPlacidTemplates([])
    } finally {
      setLoadingPlacidTemplates(false)
    }
  }

  // Delete template from staging
  const handleDeleteStaging = async (stagingId: number, templateName: string) => {
    try {
      if (!confirm(`Are you sure you want to remove "${templateName}" from staging?\n\nThis will permanently delete it from the database.`)) {
        return
      }

      const { error } = await supabaseAdmin
        .from("placid_template_staging")
        .delete()
        .eq("id", stagingId)

      if (error) throw error

      showToast(`"${templateName}" removed from staging`, "success")

      // Refresh to update UI
      fetchTemplates()
    } catch (error: any) {
      showToast(`Failed to delete: ${error.message}`, "error")
      console.error("Delete error:", error)
    }
  }

  // Import single template - Pre-fill the form instead of staging
  const handleImportSingle = async (templateUuid: string) => {
    try {
      setImportingSingle(templateUuid)
      console.log("Importing template:", templateUuid)

      // Fetch full template details via backend API
      const response = await fetch(`/api/admin/placid/templates/${templateUuid}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success || !data.template) {
        throw new Error(data.error || "Invalid response from server")
      }

      const template = data.template
      console.log("Template details:", template)

      // Convert Placid layers to fields_required format
      const fields_required = (template.layers || []).map((layer: any) => ({
        name: layer.name || `layer_${layer.type}`,
        label: (layer.name || layer.type).replace(/_/g, " "),
        type: layer.type === "picture" ? "image" : "text",
        required: true,
      }))

      // Generate next template ID
      const nextId = await generateNextTemplateId("placid")

      // Pre-populate the form
      setFormData({
        template_name: template.title || template.name || "",
        template_id: nextId,
        template_uuid: templateUuid,
        engine_type: "placid",
        ai_prompt: "",
        price: 0,
        tag: "",
        category: "",
        thumbnail_path: template.thumbnail || "",
        poster_reference: "",
        fields_required: fields_required,
      })

      // Close modal and show the form
      setShowImportModal(false)
      setIsCreating(true)
      setEditingTemplate(null)

      showToast(
        `Template "${template.title || template.name}" loaded! Review and edit fields, then save.`,
        "success"
      )
    } catch (error: any) {
      showToast(`Import failed: ${error.message}`, "error")
      console.error("Import error:", error)
    } finally {
      setImportingSingle(null)
    }
  }

  // Toggle template selection
  const toggleTemplateSelection = (uuid: string) => {
    setSelectedTemplates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(uuid)) {
        newSet.delete(uuid)
      } else {
        newSet.add(uuid)
      }
      return newSet
    })
  }

  // Select/Deselect all templates
  const toggleSelectAll = () => {
    if (selectedTemplates.size === placidTemplates.length) {
      setSelectedTemplates(new Set())
    } else {
      const allUUIDs = new Set(placidTemplates.map((t: any) => t.uuid))
      setSelectedTemplates(allUUIDs)
    }
  }

  // Import selected templates to staging
  const handleImportAll = async () => {
    try {
      if (selectedTemplates.size === 0) {
        showToast("Please select at least one template to import", "error")
        return
      }

      if (!confirm(`Import ${selectedTemplates.size} selected template(s) to staging? You can edit them individually before publishing.`)) {
        return
      }

      setLoadingPlacidTemplates(true)
      console.log("Starting bulk import to staging...")

      const response = await fetch("/api/admin/placid/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          import_all: true,
          selected_uuids: Array.from(selectedTemplates)
        }),
      })

      const data = await response.json()

      console.log("Bulk import response:", response.status, data)

      if (response.ok) {
        showToast(
          `Success! ${data.imported} templates imported to staging. ${data.skipped} skipped.`,
          "success"
        )
        setShowImportModal(false)
        // Refresh templates list to show staging templates
        fetchTemplates()
      } else {
        showToast(data.error || "Failed to import templates", "error")
        console.error("Bulk import failed:", data)
      }
    } catch (error: any) {
      showToast(`Import failed: ${error.message}`, "error")
      console.error("Bulk import error:", error)
    } finally {
      setLoadingPlacidTemplates(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen section-fade-in">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <RippleLoader size={100} color="#2563eb" speed={1.0} />
          </div>
          <p className="mt-6 text-green-900">Welcome Wazimu</p>
          <p className="mt-4 text-gray-700">Loading templates…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-h-screen p-6 section-fade-in scroll-fade-in transition-smooth">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Poster Templates</h1>
        <div className="flex items-center gap-2">
          {/* Engine Filter */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4 border border-gray-200 shadow-inner">
            <button
              onClick={() => setEngineFilter("all")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${engineFilter === "all"
                ? "bg-white text-blue-700 shadow-md transform scale-105"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                }`}
            >
              All
            </button>
            <button
              onClick={() => setEngineFilter("placid")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${engineFilter === "placid"
                ? "bg-white text-blue-700 shadow-md transform scale-105"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                }`}
            >
              Placid
            </button>
            <button
              onClick={() => setEngineFilter("ai")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${engineFilter === "ai"
                ? "bg-white text-purple-700 shadow-md transform scale-105"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                }`}
            >
              AI
            </button>
          </div>

          <Button
            onClick={refreshTemplates}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50 transition-smooth"
            disabled={refreshing}
          >
            {refreshing ? (
              <span className="flex items-center"><RippleLoader size={16} color="#2563eb" speed={1.2} className="mr-2" />Refreshing…</span>
            ) : (
              <span className="flex items-center"><Upload className="w-4 h-4 mr-2" />Refresh</span>
            )}
          </Button>
          <div className="flex space-x-2">
            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50 transition-smooth"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import from Placid
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Templates from Placid</DialogTitle>
                  <DialogDescription>
                    Choose to import all available templates or fetch a specific one by UUID.
                  </DialogDescription>
                </DialogHeader>

                {/* Mode Selector */}
                <div className="flex gap-2 mt-4 p-2 bg-[#00973E] rounded-lg">
                  <Button
                    onClick={() => {
                      setImportMode("all")
                      setSingleUUID("")
                      setPlacidTemplates([])
                    }}
                    variant={importMode === "all" ? "default" : "outline"}
                    className="flex-1"
                  >
                    Import All Available
                  </Button>
                  <Button
                    onClick={() => {
                      setImportMode("single")
                      setPlacidTemplates([])
                    }}
                    variant={importMode === "single" ? "default" : "outline"}
                    className="flex-1"
                  >
                    Import Single by UUID
                  </Button>
                </div>

                {/* Single UUID Input */}
                {importMode === "single" && (
                  <div className="mt-4 space-y-2">
                    <Label>Placid Template UUID</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., rxg1ppje83dak"
                        value={singleUUID}
                        onChange={(e) => setSingleUUID(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={fetchSingleTemplate}
                        disabled={loadingPlacidTemplates || !singleUUID.trim()}
                      >
                        {loadingPlacidTemplates ? "Loading..." : "Fetch"}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Enter a Placid template UUID to fetch and import just that template.
                    </p>
                  </div>
                )}

                {/* Fetch All Button (only for "all" mode) */}
                {importMode === "all" && placidTemplates.length === 0 && !loadingPlacidTemplates && (
                  <Button
                    onClick={fetchPlacidTemplates}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Load All Templates from Placid
                  </Button>
                )}

                <div className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={toggleSelectAll}
                      variant="outline"
                      disabled={loadingPlacidTemplates || placidTemplates.length === 0}
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {selectedTemplates.size === placidTemplates.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button
                      onClick={handleImportAll}
                      disabled={loadingPlacidTemplates || selectedTemplates.size === 0}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {loadingPlacidTemplates ? (
                        <>
                          <RippleLoader size={16} color="#fff" speed={1.2} className="mr-2" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Import Selected ({selectedTemplates.size})
                        </>
                      )}
                    </Button>
                  </div>

                  {loadingPlacidTemplates && placidTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <RippleLoader size={50} color="#2563eb" speed={1.0} />
                      <p className="mt-4 text-gray-600">Fetching templates from Placid...</p>
                    </div>
                  ) : placidTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500 text-lg">No templates found</p>
                      <p className="text-gray-400 text-sm mt-2">
                        Make sure you have templates in your Placid account
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.isArray(placidTemplates) && placidTemplates.map((template: any) => (
                        <Card
                          key={template.uuid}
                          className={`hover:shadow-lg transition-shadow border-2 ${selectedTemplates.has(template.uuid)
                            ? 'border-green-500 bg-green-50'
                            : 'hover:border-blue-300'
                            }`}
                        >
                          <CardContent className="p-0">
                            {/* Thumbnail at top with checkbox */}
                            {template.thumbnail_url && (
                              <div className="relative w-full h-32 bg-gray-100 rounded-t-lg overflow-hidden">
                                <img
                                  src={template.thumbnail_url}
                                  alt={template.name}
                                  className="w-full h-full object-cover"
                                />
                                {/* Checkbox overlay */}
                                <div className="absolute top-2 left-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedTemplates.has(template.uuid)}
                                    onChange={() => toggleTemplateSelection(template.uuid)}
                                    className="w-5 h-5 cursor-pointer accent-green-600"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Content section */}
                            <div className="p-4">
                              <h4 className="font-bold text-gray-900 mb-2 text-base line-clamp-2">
                                {template.name || "Untitled Template"}
                              </h4>

                              <div className="space-y-1 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-500">UUID:</span>
                                  <span className="text-xs text-gray-700 font-mono truncate">{template.uuid}</span>
                                </div>

                                {template.layers && Array.isArray(template.layers) && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-500">Layers:</span>
                                    <span className="text-xs text-blue-600 font-medium">
                                      {template.layers.length} layer(s)
                                    </span>
                                  </div>
                                )}

                                {template.width && template.height && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-500">Size:</span>
                                    <span className="text-xs text-gray-700">
                                      {template.width}×{template.height}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <Button
                                onClick={() => handleImportSingle(template.uuid)}
                                disabled={importingSingle === template.uuid}
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                              >
                                {importingSingle === template.uuid ? (
                                  <>
                                    <RippleLoader size={12} color="#fff" speed={1.2} className="mr-2" />
                                    Importing...
                                  </>
                                ) : (
                                  "Import This Template"
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={async () => {
                const nextId = await generateNextTemplateId("placid")
                setFormData((prev) => ({ ...prev, engine_type: "placid", template_id: nextId }))
                setIsCreating(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 hover-subtle transition-smooth text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Placid Poster
            </Button>
            <Button
              onClick={async () => {
                const nextId = await generateNextTemplateId("ai")
                setFormData((prev) => ({ ...prev, engine_type: "ai", template_id: nextId }))
                setIsCreating(true)
              }}
              className="bg-purple-600 hover:bg-purple-700 hover-subtle transition-smooth text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add AI Poster
            </Button>
          </div>
        </div>
      </div>

      {/* Staged Posters Section - Only visible when there are pending templates */}
      {console.log("Staging templates count:", stagingTemplates.length, stagingTemplates)}
      {stagingTemplates.length > 0 && (
        <Card className="shadow-lg mb-6 border-2 border-yellow-400">
          <CardHeader className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></span>
                Staged Posters Pending Review ({stagingTemplates.length})
              </span>
              <Badge className="bg-white/20 text-white">Action Required</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-600 mb-4">
              These templates have been imported from Placid and are waiting for your review. Edit them to add pricing, category, and finalize fields before publishing.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stagingTemplates.map((stagingTemplate: any) => (
                <Card key={stagingTemplate.id} className="border-2 border-yellow-200 hover:border-yellow-400 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1">{stagingTemplate.placid_name}</h4>
                        <p className="text-xs text-gray-500 font-mono mb-2">{stagingTemplate.placid_template_uuid}</p>
                        <Badge className="bg-yellow-500 text-white text-xs">Pending</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {stagingTemplate.placid_layers?.length || 0} layer(s)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          // Load staging template into form
                          const nextId = await generateNextTemplateId("placid")

                          // Convert layers to fields_required format
                          const fields_required = (stagingTemplate.placid_layers || []).map((layer: any) => ({
                            name: layer.name || `layer_${layer.type}`,
                            label: (layer.name || layer.type).replace(/_/g, " "),
                            type: layer.type === "picture" ? "image" : "text",
                            required: true,
                          }))

                          setFormData({
                            template_name: stagingTemplate.placid_name,
                            template_id: nextId,
                            template_uuid: stagingTemplate.placid_template_uuid,
                            engine_type: "placid",
                            ai_prompt: "",
                            price: 0,
                            tag: "",
                            category: "",
                            thumbnail_path: "",
                            poster_reference: "",
                            fields_required: fields_required,
                          })

                          // Mark this as a staging template being edited
                          setEditingTemplate({
                            ...stagingTemplate,
                            is_staging: true,
                            staging_id: stagingTemplate.id
                          } as any)
                          setIsCreating(true)

                          showToast(`Loaded "${stagingTemplate.placid_name}" for review`, "success")
                        }}
                        size="sm"
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Review & Publish
                      </Button>
                      <Button
                        onClick={() => handleDeleteStaging(stagingTemplate.id, stagingTemplate.placid_name)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-500 hover:bg-red-600"
                        title="Delete from staging"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="shadow-lg">
          <CardHeader className={`bg-gradient-to-r ${formData.engine_type === 'ai' ? 'from-purple-700 via-fuchsia-700 to-pink-700' : 'from-indigo-700 via-sky-700 to-purple-700'} text-white rounded-t-lg shadow-md section-fade-in transition-smooth`}>
            <CardTitle className="text-white flex items-center justify-between">
              <span>
                {editingTemplate?.is_staging
                  ? "Review Staged Template"
                  : editingTemplate
                    ? "Edit Template"
                    : "Create New Template"
                }
              </span>
              <Badge className="bg-white/20 text-white border-none backdrop-blur-sm">
                {formData.engine_type === "ai" ? "AI Render Engine" : "Placid Render Engine"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white p-6 rounded-b-lg space-y-4 shadow-inner border border-gray-200 section-fade-in scroll-fade-in transition-smooth">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template_name" className="text-gray-700 font-medium">
                  Template Name *
                </Label>
                <Input
                  id="template_name"
                  value={formData.template_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, template_name: e.target.value }))}
                  placeholder="e.g., Business Card Template"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-smooth"
                />
              </div>
              <div>
                <Label htmlFor="template_id" className="text-gray-700 font-medium flex items-center gap-2">
                  Template ID *
                  <span className="text-xs text-gray-500 font-normal">(Auto-generated)</span>
                </Label>
                <Input
                  id="template_id"
                  value={formData.template_id}
                  readOnly
                  className="border-gray-300 bg-gray-50 cursor-not-allowed font-mono text-sm"
                  title="This ID is automatically generated"
                />
              </div>

              {formData.engine_type === "placid" && (
                <div>
                  <Label htmlFor="template_uuid" className="text-gray-700 font-medium">
                    Template UUID (Placid ID) *
                  </Label>
                  <Input
                    id="template_uuid"
                    value={formData.template_uuid}
                    onChange={(e) => setFormData((prev) => ({ ...prev, template_uuid: e.target.value }))}
                    placeholder="e.g., abc123-def456-ghi789"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="price" className="text-gray-700 font-medium">
                  Price (KSh)
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="0"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-gray-700 font-medium">
                  Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  required
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select category *" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Data">Data</SelectItem>
                    <SelectItem value="Minutes">Minutes</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="Special Offers">Special Offers</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tag" className="text-gray-700 font-medium">
                Tag (Optional)
              </Label>
              <Input
                id="tag"
                value={formData.tag}
                onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
                placeholder="e.g., New, Popular, Limited"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                This tag will appear in the top right corner of the thumbnail on the user interface
              </p>
            </div>

            {/* AI Specific Section */}
            {formData.engine_type === "ai" && (
              <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-purple-900 flex items-center">
                  <span className="mr-2">🤖</span> AI Poster Blueprint (Locked Design)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <Label className="text-purple-800 font-medium mb-2 block">Reference Poster Preview</Label>
                    <div className="border border-purple-200 rounded bg-white p-2 min-h-[150px] relative">
                      {/* Upload Trigger */}
                      <label className="cursor-pointer block h-full w-full">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAIReferenceUpload}
                          className="hidden"
                          disabled={uploadingThumbnail}
                        />
                        {formData.poster_reference ? (
                          <div className="relative group">
                            <img
                              src={getThumbnailUrl(formData.poster_reference)}
                              alt="Reference"
                              className="max-w-full max-h-40 object-contain mx-auto"
                            />
                            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center rounded transition-opacity">
                              <span className="text-white text-xs font-medium flex items-center">
                                <Upload className="w-3 h-3 mr-1" /> Change
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-purple-400 text-sm flex flex-col items-center justify-center h-40 hover:bg-purple-50 transition-colors rounded">
                            {uploadingThumbnail ? (
                              <RippleLoader size={24} color="#9333ea" speed={1.2} />
                            ) : (
                              <>
                                <Upload className="w-8 h-8 mb-2 opacity-50" />
                                <p>Click to Upload Reference</p>
                              </>
                            )}
                          </div>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-purple-600 mt-2">
                      {formData.poster_reference ? "✅ Reference uploaded!" : "This visual is used as the style reference for the AI model."}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="ai_prompt" className="text-purple-800 font-medium mb-2 block">
                      Poster Blueprint JSON *
                    </Label>
                    <Textarea
                      id="ai_prompt"
                      value={formData.ai_prompt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, ai_prompt: e.target.value }))}
                      placeholder='{ "layers": [ ... ], "dimensions": { ... } }'
                      className="font-mono text-xs min-h-[150px] bg-white border-purple-200 focus:border-purple-500"
                    />
                    <p className="text-xs text-purple-600 mt-1">
                      Paste the fixed JSON structure representing the poster layout.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Thumbnail Upload Section */}
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Thumbnail Image</Label>

              <div className="space-y-4">
                {/* Upload Button + Thumbnail Link Field */}
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      disabled={uploadingThumbnail}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                      disabled={uploadingThumbnail}
                      asChild
                    >
                      <span>
                        {uploadingThumbnail ? (
                          <>
                            <RippleLoader size={24} color="#2563eb" speed={1.2} className="mr-2" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                          </>
                        )}
                      </span>
                    </Button>
                  </label>

                  {/* Thumbnail Link Input */}
                  <div className="flex-1 min-w-[240px]">
                    <Label htmlFor="thumbnail_link" className="text-gray-700 font-medium">
                      or Thumbnail Link
                    </Label>
                    <Input
                      id="thumbnail_link"
                      value={formData.thumbnail_path}
                      onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail_path: e.target.value }))}
                      placeholder="Paste a public URL or storage path (e.g., thumbnails/file.png)"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supports external URLs and Supabase Storage paths. Preview updates live.
                    </p>
                  </div>

                  {formData.thumbnail_path && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearThumbnail}
                      className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Thumbnail Preview */}
                {formData.thumbnail_path && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-4">
                      <img
                        src={getThumbnailUrl(formData.thumbnail_path)}
                        alt="Thumbnail preview"
                        className="w-32 h-24 object-cover rounded border border-gray-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=96&width=128&text=Error"
                        }}
                      />
                      <div className="flex-1 text-sm text-gray-600">
                        <p className="font-medium text-gray-800 mb-1">Thumbnail Preview</p>
                        <p>Path: {formData.thumbnail_path}</p>
                        <p>Storage: Supabase public bucket</p>
                        <p className="text-green-600 mt-1">✅ Ready to save</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Fields Required Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-gray-700 font-medium">Required Fields</Label>
                {formData.engine_type === "placid" && (
                  <Button
                    type="button"
                    onClick={addField}
                    size="sm"
                    variant="outline"
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Field
                  </Button>
                )}
              </div>

              {/* AI Templates: Show Derived Fields (Read-Only) */}
              {formData.engine_type === "ai" ? (
                <div className="space-y-3">
                  {blueprintError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      ⚠ {blueprintError}
                    </div>
                  )}

                  {derivedAIFields.length === 0 && !blueprintError && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded text-purple-700 text-sm text-center">
                      No fields detected. Add valid JSON blueprint with <code className="bg-purple-100 px-1 rounded">variable_text</code> blocks.
                    </div>
                  )}

                  {derivedAIFields.length > 0 && (
                    <>
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded text-purple-700 text-sm">
                        ✨ <strong>{derivedAIFields.length} field(s)</strong> auto-detected from blueprint. To edit, modify the JSON above.
                      </div>

                      {derivedAIFields.map((field, index) => (
                        <div key={index} className="border border-purple-200 rounded p-3 bg-gradient-to-br from-purple-50 to-pink-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <div className="text-xs font-semibold text-purple-800 mb-1">Field Key</div>
                              <div className="font-mono text-purple-900 bg-white px-2 py-1 rounded border border-purple-200">
                                {field.field_key}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-purple-800 mb-1">Label</div>
                              <div className="text-purple-900 bg-white px-2 py-1 rounded border border-purple-200">
                                {field.label}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-purple-800 mb-1">Type</div>
                              <div className="text-purple-900 bg-white px-2 py-1 rounded border border-purple-200 capitalize">
                                {field.input_type}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-purple-800 mb-1">Group</div>
                              <div className="text-purple-900 bg-white px-2 py-1 rounded border border-purple-200 text-xs truncate">
                                {field.group || "General"}
                              </div>
                            </div>
                          </div>
                          {field.placeholder && (
                            <div className="mt-2 text-xs text-purple-600">
                              <span className="font-semibold">Placeholder:</span> {field.placeholder}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                /* Placid Templates: Manual Field Editing */
                <>
                  {formData.fields_required.map((field, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 mb-2 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                        <div>
                          <Label className="text-gray-700">Field Name</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(index, { name: e.target.value })}
                            placeholder="e.g., company_name"
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700">Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="e.g., Company Name"
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700">Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value: "text" | "textarea" | "image") => updateField(index, { type: value })}
                          >
                            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <Label className="text-gray-700">Required</Label>
                          <Button
                            type="button"
                            onClick={() => removeField(index)}
                            size="sm"
                            variant="destructive"
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate?.is_staging ? "Publish to Templates" : editingTemplate ? "Update" : "Create"}
              </Button>
              <Button onClick={resetForm} variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates
          .filter((t) => engineFilter === "all" || (t.engine_type || "placid") === engineFilter)
          .map((template) => (
            <Card key={template.template_id} className="bg-white shadow-sm rounded-lg hover:shadow-md transition border border-gray-200">
              {/* Top Section: Thumbnail */}
              <div className="relative w-full">
                <img
                  src={getThumbnailUrl(template.thumbnail_path || "")}
                  alt={template.template_name}
                  className="w-full h-auto object-contain rounded-t-lg border-b border-gray-200 bg-white"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `/placeholder.svg?height=128&width=200&text=${encodeURIComponent(template.template_name)}`
                  }}
                />

                {/* Template Tag Overlay */}
                {template.tag && (
                  <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {template.tag}
                  </span>
                )}

                {/* Thumbnail Status Indicator */}
                <div className="absolute top-2 left-2">
                  {template.thumbnail_path ? (
                    <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      Linked
                    </div>
                  ) : (
                    <div className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs">No Image</div>
                  )}
                </div>
              </div>

              {/* Bottom Section: Info Panel */}
              <CardContent className="p-3 rounded-b-lg bg-gray-50 space-y-2">
                <h3 className="font-semibold text-base text-gray-900">{template.template_name}</h3>
                <p className="text-xs text-gray-600">ID: {template.template_id}</p>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Fields: {template.fields_required?.length || 0}</span>
                  <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium">
                    KSh {template.price}
                  </span>
                </div>

                <div className="mt-2">
                  <Badge className={template.engine_type === "ai" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                    {template.engine_type === "ai" ? "AI Render" : "Placid Render"}
                  </Badge>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => handleDelete(template.template_id)}
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-xs bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                    <Button
                      onClick={() => handleEdit(template)}
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={template.is_active}
                    onClick={() => handleToggleActive(template)}
                    className={`relative inline-flex items-center h-7 px-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${template.is_active ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-700"
                      }`}
                    title={template.is_active ? "Active" : "Inactive"}
                  >
                    <span
                      className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow transform transition-transform ${template.is_active ? "translate-x-6" : "translate-x-0"
                        }`}
                    />
                    <span className="text-xs font-medium ml-8">{template.is_active ? "Active" : "Inactive"}</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {templates.length === 0 && (
        <Card className="bg-white shadow-sm rounded-lg">
          <CardContent className="text-center py-8 text-gray-700">
            <p>No templates found. Create your first template!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
