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

interface FieldRequirement {
  name: string
  label: string
  type: "text" | "textarea" | "image"
  required: boolean
}

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<PosterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<PosterTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    template_name: "",
    template_id: "",
    template_uuid: "",
    price: 0,
    tag: "",
    category: "",
    thumbnail_path: "",
    fields_required: [] as FieldRequirement[],
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabaseAdmin.from("poster_templates").select("*").order("template_name")

      if (error) throw error

      // Templates fetched; avoid console logging
      data?.forEach((template) => {
        // Avoid logging template details to console
      })

      setTemplates(data || [])
    } catch (error: any) {
      // Silent failure; surface via toast only
      showToast(`Failed to fetch templates: ${error.message}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.template_name || !formData.template_id || !formData.template_uuid || !formData.category) {
        showToast("Please fill in all required fields", "error")
        return
      }

      const templateData = {
        ...formData,
        fields_required: formData.fields_required,
      }

      // Saving template; no console output

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
      template_uuid: template.template_uuid,
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-gradient-to-b from-sky-50 via-rose-50 to-orange-50 min-h-screen p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Poster Templates</h1>
        <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-700 via-sky-700 to-purple-700 text-white rounded-t-lg shadow-md">
            <CardTitle className="text-white">{editingTemplate ? "Edit Template" : "Create New Template"}</CardTitle>
          </CardHeader>
          <CardContent className="bg-white p-6 rounded-b-lg space-y-4 shadow-inner border border-gray-200">
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
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="template_id" className="text-gray-700 font-medium">
                  Template ID *
                </Label>
                <Input
                  id="template_id"
                  value={formData.template_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, template_id: e.target.value }))}
                  placeholder="e.g., business-card-001"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
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
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
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
              <Label htmlFor="tag" className="text-gray-700 font-medium">
                Tag
              </Label>
              <Input
                id="tag"
                value={formData.tag}
                onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
                placeholder="Short tag, e.g., Promo, New, Hot"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Thumbnail Upload Section */}
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Thumbnail Image</Label>

              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center gap-4">
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
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
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

                {/* Upload Instructions */}
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
                  <p className="font-medium mb-1">📝 Upload Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Supported formats: JPG, PNG, GIF, WebP</li>
                    <li>Maximum file size: 5MB</li>
                    <li>Recommended dimensions: 400x300 pixels</li>
                    <li>Images will be stored as base64 in the database</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fields Required Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-gray-700 font-medium">Required Fields</Label>
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
              </div>

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
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate ? "Update" : "Create"}
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
        {templates.map((template) => (
          <Card key={template.template_id} className="bg-white shadow-sm rounded-lg hover:shadow-md transition">
            <CardHeader className="bg-gradient-to-r from-sky-600 to-rose-500 text-white rounded-t-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white text-2xl font-bold tracking-tight leading-tight">
                    {template.template_name}
                  </CardTitle>
                  <p className="text-sm text-gray-100 mt-1">ID: {template.template_id}</p>
                  <p className="text-sm text-gray-100">UUID: {template.template_uuid}</p>
                </div>
                <div className="flex space-x-1">
                  <Button
                    onClick={() => handleEdit(template)}
                    size="sm"
                    variant="outline"
                    className="bg-white/20 text-white hover:bg-white/30"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(template.template_id)}
                    size="sm"
                    variant="destructive"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardContent className="bg-gray-50 p-4 rounded-b-md space-y-2 border border-gray-200">
                    {/* Thumbnail Display */}
                    <div className="relative">
                      <img
                        src={getThumbnailUrl(template.thumbnail_path || "")}
                        alt={template.template_name}
                        className="w-full max-h-48 object-contain rounded mb-3 border border-gray-200 bg-white"
                        onError={(e) => {
                          // Silent image load failure; fallback to placeholder
                          const target = e.target as HTMLImageElement
                          target.src = `/placeholder.svg?height=128&width=200&text=${encodeURIComponent(template.template_name)}`
                        }}
                      />

                      {/* Thumbnail Status Indicator */}
                      <div className="absolute top-2 right-2">
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

                    {/* Removed overview, badges, and progress bar per admin UI update */}

                    <div className="flex justify-between items-center mb-2">
                      <Badge className="bg-blue-100 text-blue-800">{template.category}</Badge>
                      <span className="font-semibold text-gray-800">KSh {template.price}</span>
                    </div>
                    <div className="text-xs text-gray-600">Fields: {template.fields_required?.length || 0}</div>
                  </CardContent>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Click to edit or delete this template.</p>
                  <p className="text-xs text-gray-400">Template ID: {template.template_id}</p>
                  <p className="text-xs text-gray-400">Thumbnail: {template.thumbnail_path ? template.thumbnail_path : "None"}</p>
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
                className={`relative inline-flex items-center h-7 px-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  template.is_active ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-700"
                }`}
                title={template.is_active ? "Active" : "Inactive"}
              >
                <span
                  className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    template.is_active ? "translate-x-6" : "translate-x-0"
                  }`}
                />
                <span className="text-xs font-medium ml-8">{template.is_active ? "Active" : "Inactive"}</span>
              </button>
            </div>
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
