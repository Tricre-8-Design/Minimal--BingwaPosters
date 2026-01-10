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
import { Trash2, Plus, Edit, Save, X, Upload, ImageIcon } from "lucide-react"
import { supabaseAdmin, type PosterTemplate, showToast, getThumbnailUrl } from "@/lib/supabase"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import LoadingScreen from "@/components/loading-screen"

interface FieldRequirement {
  name: string
  label: string
  type: "text" | "textarea" | "image"
  required: boolean
  json_path?: string
}

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<PosterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<PosterTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [engineFilter, setEngineFilter] = useState<"all" | "placid" | "ai">("all")

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
    fields_required: [] as FieldRequirement[],
  })

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

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabaseAdmin.from("poster_templates").select("*").order("template_name")

      if (error) throw error

      // Templates fetched
      setTemplates(data || [])
    } catch (error: any) {
      // Silent failure; surface via toast only
      showToast(`Failed to fetch templates: ${error.message}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const refreshTemplates = async () => {
    try {
      setRefreshing(true)
      const { data, error } = await supabaseAdmin.from("poster_templates").select("*").order("template_name")
      if (error) throw error
      setTemplates(data || [])
      showToast("Templates refreshed successfully", "success")
    } catch (error: any) {
      showToast(`Failed to refresh templates: ${error.message}`, "error")
    } finally {
      setRefreshing(false)
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

        // Validate json_path for all fields
        const missingPath = formData.fields_required.some((f) => !f.json_path)
        if (missingPath) {
          showToast("All fields in AI templates must have a JSON Path", "error")
          return
        }
      }

      const templateData = {
        ...formData,
        template_uuid: formData.engine_type === "ai" ? null : formData.template_uuid,
        ai_prompt: parsedAiPrompt,
        fields_required: formData.fields_required,
      }

      // Saving template

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabaseAdmin
          .from("poster_templates")
          .update(templateData)
          .eq("template_id", editingTemplate.template_id)

        if (error) throw error
        showToast("Template updated successfully!", "success")
      } else {
        // Create new template
        const { error } = await supabaseAdmin
          .from("poster_templates")
          .insert([{ ...templateData, is_active: true }])

        if (error) throw error
        showToast("Template created successfully!", "success")
      }

      // Reset form and refresh
      resetForm()
      fetchTemplates()
    } catch (error: any) {
      // Silent failure; surface via toast only
      showToast(`Failed to save template: ${error.message}`, "error")
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
      fields_required: [],
    })
    setEditingTemplate(null)
    setIsCreating(false)
  }

  const addField = () => {
    setFormData((prev) => ({
      ...prev,
      fields_required: [...prev.fields_required, { name: "", label: "", type: "text", required: true, json_path: "" }],
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

      const { data, error } = await supabaseAdmin.storage
        .from("templates-thumbnails")
        .upload(`thumbnails/${fileName}`, file)

      if (error) {
        // Silent failure; surface via toast only
        showToast("Thumbnail upload failed.", "error")
        return
      }

      const uploadedPath = data.path

      if (editingTemplate?.template_id) {
        const { error: dbError } = await supabaseAdmin
          .from("poster_templates")
          .update({ thumbnail_path: uploadedPath })
          .eq("template_id", editingTemplate.template_id)

        if (dbError) {
          // Silent failure; surface via toast only
          showToast("Failed to save thumbnail path to template.", "error")
        } else {
          showToast("Thumbnail saved and linked to template.", "success")
        }
      } else {
        showToast("Thumbnail uploaded. It will be saved when you create the template.", "success")
      }

      setFormData((prev) => ({
        ...prev,
        thumbnail_path: uploadedPath,
      }))
    } catch (error: any) {
      // Silent failure; surface via toast only
      showToast("Thumbnail upload failed.", "error")
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

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-6 bg-app min-h-screen p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary">Poster Templates</h1>
        <div className="flex items-center gap-2">
          {/* Engine Filter */}
          <div className="flex items-center bg-white rounded-lg border border-border p-1 mr-2">
            <button
              onClick={() => setEngineFilter("all")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${engineFilter === "all" ? "bg-primary text-text-inverse shadow-sm" : "text-text-secondary hover:text-text-primary"
                }`}
            >
              All
            </button>
            <button
              onClick={() => setEngineFilter("placid")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${engineFilter === "placid"
                ? "bg-primary text-text-inverse shadow-sm"
                : "text-text-secondary hover:text-text-primary"
                }`}
            >
              Placid
            </button>
            <button
              onClick={() => setEngineFilter("ai")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${engineFilter === "ai"
                ? "bg-primary text-text-inverse shadow-sm"
                : "text-text-secondary hover:text-text-primary"
                }`}
            >
              AI
            </button>
          </div>

          <Button
            onClick={refreshTemplates}
            className="bg-app-elevated hover:bg-primary-soft text-text-primary border border-border"
            disabled={refreshing}
            size="sm"
          >
            {refreshing ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>Refreshing…
              </span>
            ) : (
              <span className="flex items-center">
                <Upload className="w-3 h-3 mr-2" />
                Refresh
              </span>
            )}
          </Button>
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                setFormData((prev) => ({ ...prev, engine_type: "placid" }))
                setIsCreating(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Placid
            </Button>
            <Button
              onClick={() => {
                setFormData((prev) => ({ ...prev, engine_type: "ai" }))
                setIsCreating(true)
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add AI
            </Button>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-text-primary flex items-center justify-between">
              <span>{editingTemplate ? "Edit Template" : "Create New Template"}</span>
              <Badge className={formData.engine_type === "ai" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                {formData.engine_type === "ai" ? "AI Render Engine" : "Placid Render Engine"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white p-6 rounded-b-lg space-y-4 border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template_name" className="text-text-secondary font-medium">
                  Template Name *
                </Label>
                <Input
                  id="template_name"
                  value={formData.template_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, template_name: e.target.value }))}
                  placeholder="e.g., Business Card Template"
                  className=""
                />
              </div>
              <div>
                <Label htmlFor="template_id" className="text-text-secondary font-medium">
                  Template ID *
                </Label>
                <Input
                  id="template_id"
                  value={formData.template_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, template_id: e.target.value }))}
                  placeholder="e.g., business-card-001"
                  className=""
                />
              </div>
              {formData.engine_type === "placid" && (
                <div>
                  <Label htmlFor="template_uuid" className="text-text-secondary font-medium">
                    Template UUID (Placid ID) *
                  </Label>
                  <Input
                    id="template_uuid"
                    value={formData.template_uuid}
                    onChange={(e) => setFormData((prev) => ({ ...prev, template_uuid: e.target.value }))}
                    placeholder="e.g., abc123-def456-ghi789"
                    className=""
                  />
                </div>
              )}
              <div>
                <Label htmlFor="price" className="text-text-secondary font-medium">
                  Price (KSh)
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="0"
                  className=""
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-text-secondary font-medium">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="">
                    <SelectValue placeholder="Select category" />
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
              <Label htmlFor="tag" className="text-text-secondary font-medium">
                Tag
              </Label>
              <Input
                id="tag"
                value={formData.tag}
                onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
                placeholder="Short tag, e.g., Promo, New, Hot"
                className=""
              />
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
                    <div className="border border-purple-200 rounded bg-white p-2 flex items-center justify-center min-h-[150px]">
                      {formData.thumbnail_path ? (
                        <img
                          src={getThumbnailUrl(formData.thumbnail_path)}
                          alt="Reference"
                          className="max-w-full max-h-40 object-contain"
                        />
                      ) : (
                        <div className="text-center text-purple-400 text-sm">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Upload thumbnail to see reference</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-purple-600 mt-2">
                      This visual is used as the style reference for the AI model.
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
                      className="font-mono text-xs min-h-[150px] bg-white"
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
              <Label className="text-text-secondary font-medium mb-2 block">Thumbnail Image</Label>

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
                      className="bg-app-elevated text-text-primary hover:bg-primary-soft"
                      disabled={uploadingThumbnail}
                      asChild
                    >
                      <span>
                        {uploadingThumbnail ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                            Uploading...
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
                    <Label htmlFor="thumbnail_link" className="text-text-secondary font-medium">
                      or Thumbnail Link
                    </Label>
                    <Input
                      id="thumbnail_link"
                      value={formData.thumbnail_path}
                      onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail_path: e.target.value }))}
                      placeholder="Paste a public URL or storage path (e.g., thumbnails/file.png)"
                      className=""
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Supports external URLs and Supabase Storage paths. Preview updates live.
                    </p>
                  </div>

                  {formData.thumbnail_path && (
                    <Button
                      type="button"
                      onClick={clearThumbnail}
                      className="bg-danger text-text-inverse hover:bg-danger/90"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Thumbnail Preview */}
                {formData.thumbnail_path && (
                  <div className="border border-border rounded-lg p-4 bg-app-elevated">
                    <div className="flex items-start gap-4">
                      <img
                        src={getThumbnailUrl(formData.thumbnail_path)}
                        alt="Thumbnail preview"
                        className="w-32 h-24 object-cover rounded border border-border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=96&width=128&text=Error"
                        }}
                      />
                      <div className="flex-1 text-sm text-text-secondary">
                        <p className="font-medium text-text-primary mb-1">Thumbnail Preview</p>
                        <p>Path: {formData.thumbnail_path}</p>
                        <p>Storage: Supabase public bucket</p>
                        <p className="text-success mt-1">✅ Ready to save</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Instructions */}
                <div className="text-xs text-text-muted bg-app-elevated p-3 rounded border border-border">
                  <p className="font-medium mb-1">📝 Upload Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Supported formats: JPG, PNG, GIF, WebP</li>
                    <li>Maximum file size: 5MB</li>
                    <li>For AI Templates: Upload the exact reference poster image.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fields Required Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-text-secondary font-medium">Required Fields</Label>
                <Button
                  type="button"
                  onClick={addField}
                  size="sm"
                  className="bg-app-elevated text-text-primary hover:bg-primary-soft"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Field
                </Button>
              </div>

              {formData.fields_required.map((field, index) => (
                <div key={index} className="border border-border rounded p-3 mb-2 bg-app-elevated">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div>
                      <Label className="text-text-secondary">Field Name</Label>
                      <Input
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        placeholder="e.g., company_name"
                        className=""
                      />
                    </div>
                    <div>
                      <Label className="text-text-secondary">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="e.g., Company Name"
                        className=""
                      />
                    </div>
                    <div>
                      <Label className="text-text-secondary">Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(value: "text" | "textarea" | "image") => updateField(index, { type: value })}
                      >
                        <SelectTrigger className="">
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
                        className="rounded text-primary"
                      />
                      <Label className="text-text-secondary">Required</Label>
                      <Button
                        type="button"
                        onClick={() => removeField(index)}
                        size="sm"
                        className="bg-danger hover:bg-danger/90 text-text-inverse"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* JSON Path for AI Templates (Full Width) */}
                    {formData.engine_type === "ai" && (
                      <div className="col-span-full mt-2 bg-purple-50 p-2 rounded border border-purple-100">
                        <Label className="text-purple-800 text-xs">JSON Path Mapping (Required)</Label>
                        <Input
                          value={field.json_path || ""}
                          onChange={(e) => updateField(index, { json_path: e.target.value })}
                          placeholder="e.g., layers[0].text"
                          className="bg-white border-purple-200 text-sm h-8"
                        />
                        <p className="text-[10px] text-purple-600 mt-1">
                          Maps this field to a value in the Blueprint JSON.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleSave} className="bg-success hover:bg-success-hover text-text-inverse">
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate ? "Update" : "Create"}
              </Button>
              <Button onClick={resetForm} className="bg-app-elevated text-text-primary hover:bg-primary-soft">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card >
      )
      }

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates
          .filter((t) => engineFilter === "all" || (t.engine_type || "placid") === engineFilter)
          .map((template) => (
            <Card key={template.template_id} className="bg-white shadow-md rounded-lg transition hover:shadow-lg">
              <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-text-primary text-2xl font-bold tracking-tight leading-tight">
                      {template.template_name}
                    </CardTitle>
                    <p className="text-sm text-text-muted mt-1">ID: {template.template_id}</p>
                    <p className="text-sm text-text-muted">UUID: {template.template_uuid}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => handleEdit(template)}
                      size="sm"
                      className="bg-app-elevated text-text-primary hover:bg-primary-soft"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(template.template_id)}
                      size="sm"
                      className="bg-danger hover:bg-danger/90 text-text-inverse"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardContent className="bg-app-elevated p-4 rounded-b-md space-y-2 border border-border">
                      {/* Thumbnail Display */}
                      <div className="relative">
                        <img
                          src={getThumbnailUrl(template.thumbnail_path || "")}
                          alt={template.template_name}
                          className="w-full max-h-48 object-contain rounded mb-3 border border-border bg-white"
                          onError={(e) => {
                            // Silent image load failure; fallback to placeholder
                            const target = e.target as HTMLImageElement
                            target.src = `/placeholder.svg?height=128&width=200&text=${encodeURIComponent(template.template_name)}`
                          }}
                        />

                        {/* Thumbnail Status Indicator */}
                        <div className="absolute top-2 right-2">
                          {template.thumbnail_path ? (
                            <div className="bg-success text-text-inverse px-2 py-1 rounded-full text-xs flex items-center">
                              <ImageIcon className="w-3 h-3 mr-1" />
                              Linked
                            </div>
                          ) : (
                            <div className="bg-app-elevated text-text-muted px-2 py-1 rounded-full text-xs">No Image</div>
                          )}
                        </div>
                      </div>

                      {/* Removed overview, badges, and progress bar per admin UI update */}

                      <div className="flex justify-between items-center mb-2">
                        <Badge className="bg-primary-soft text-primary">{template.category}</Badge>
                        <Badge className={template.engine_type === "ai" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                          {template.engine_type === "ai" ? "AI Render" : "Placid Render"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-text-primary">KSh {template.price}</span>
                      </div>
                      <div className="text-xs text-text-muted">Fields: {template.fields_required?.length || 0}</div>
                    </CardContent>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm text-text-primary">Click to edit or delete this template.</p>
                    <p className="text-xs text-text-muted">Template ID: {template.template_id}</p>
                    <p className="text-xs text-text-muted">Thumbnail: {template.thumbnail_path ? template.thumbnail_path : "None"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Active toggle */}
              <div className="flex justify-end items-center mt-2 px-4 pb-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={template.is_active}
                  onClick={() => handleToggleActive(template)}
                  className={`relative inline-flex items-center h-7 px-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${template.is_active ? "bg-success text-text-inverse" : "bg-app-elevated text-text-primary border border-border"
                    }`}
                  title={template.is_active ? "Active" : "Inactive"}
                >
                  <span
                    className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${template.is_active ? "translate-x-6" : "translate-x-0"
                      }`}
                  />
                  <span className="text-xs font-medium ml-8">{template.is_active ? "Active" : "Inactive"}</span>
                </button>
              </div>
            </Card>
          ))}
      </div>

      {
        templates.length === 0 && (
          <Card className="bg-white shadow-md rounded-lg">
            <CardContent className="text-center py-8 text-text-primary">
              <p>No templates found. Create your first template!</p>
            </CardContent>
          </Card>
        )
      }
    </div >
  )
}
