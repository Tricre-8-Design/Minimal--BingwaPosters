"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { showToast } from "@/lib/supabase"
import RippleLoader from "@/components/ui/ripple-loader"
import { ArrowLeft, Save, Upload } from "lucide-react"

interface StagingTemplate {
    id: string
    placid_template_uuid: string
    placid_name: string
    placid_layers: any[]
    price: number | null
    category: string | null
    tags: string[] | null
    thumbnail_url: string | null
    status: string
    created_at: string
}

export default function StagingPage() {
    const router = useRouter()
    const [templates, setTemplates] = useState<StagingTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [committing, setCommitting] = useState(false)

    useEffect(() => {
        fetchStagingTemplates()
    }, [])

    const fetchStagingTemplates = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/admin/placid/staging")
            const data = await response.json()

            if (response.ok) {
                setTemplates(data.templates || [])
            } else {
                showToast(data.error || "Failed to fetch staging templates", "error")
            }
        } catch (error: any) {
            showToast(`Failed to fetch staging templates: ${error.message}`, "error")
        } finally {
            setLoading(false)
        }
    }

    const updateTemplate = (id: string, field: string, value: any) => {
        setTemplates((prev) =>
            prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
        )
    }

    const handleThumbnailUpload = async (id: string, file: File) => {
        if (!file.type.startsWith("image/")) {
            showToast("Please select a valid image file", "error")
            return
        }

        try {
            // Create FormData for upload
            const formData = new FormData()
            formData.append("file", file)

            // You'll need to implement an upload endpoint or use Supabase storage directly
            // For now, we'll use a placeholder URL
            showToast("Thumbnail upload placeholder - implement storage logic", "error")

            // TODO: Implement actual upload logic similar to templates-content.tsx
        } catch (error: any) {
            showToast(`Upload failed: ${error.message}`, "error")
        }
    }

    const handleCommit = async () => {
        // Validate all templates have required fields
        const invalid = templates.filter((t) => !t.price || !t.category)
        if (invalid.length > 0) {
            showToast(
                `${invalid.length} template(s) missing required fields (price & category)`,
                "error"
            )
            return
        }

        if (!confirm(`Commit ${templates.length} template(s) to production?`)) {
            return
        }

        try {
            setCommitting(true)

            // First, update all templates with their metadata
            for (const template of templates) {
                await fetch("/api/admin/placid/staging", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: template.id,
                        price: template.price,
                        category: template.category,
                        tags: template.tags,
                        thumbnail_url: template.thumbnail_url,
                    }),
                })
            }

            // Then commit all
            const response = await fetch("/api/admin/placid/staging", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    staging_ids: templates.map((t) => t.id),
                }),
            })

            const data = await response.json()

            if (response.ok) {
                showToast(
                    `Success! ${data.committed} committed, ${data.failed} failed.`,
                    "success"
                )
                // Redirect back to templates page
                router.push("/admin?tab=templates")
            } else {
                showToast(data.error || "Failed to commit templates", "error")
            }
        } catch (error: any) {
            showToast(`Commit failed: ${error.message}`, "error")
        } finally {
            setCommitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RippleLoader size={60} color="#2563eb" speed={1.0} />
                    <p className="mt-4 text-gray-700">Loading staging templates...</p>
                </div>
            </div>
        )
    }

    if (templates.length === 0) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-7xl mx-auto">
                    <Button
                        onClick={() => router.push("/admin?tab=templates")}
                        variant="outline"
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Templates
                    </Button>
                    <Card>
                        <CardContent className="p-12 text-center">
                            <p className="text-gray-500 text-lg">No templates in staging</p>
                            <p className="text-gray-400 text-sm mt-2">
                                Import templates from Placid to get started
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Button
                            onClick={() => router.push("/admin?tab=templates")}
                            variant="outline"
                            className="mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Templates
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-800 mt-2">
                            Staging: Bulk Edit Templates
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {templates.length} template(s) pending. Fill in pricing and metadata before committing.
                        </p>
                    </div>
                    <Button
                        onClick={handleCommit}
                        disabled={committing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {committing ? (
                            <>
                                <RippleLoader size={16} color="#fff" speed={1.2} className="mr-2" />
                                Committing...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Commit All to Production
                            </>
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <Card key={template.id} className="shadow-md hover:shadow-lg transition-shadow">
                            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                <CardTitle className="text-base">{template.placid_name}</CardTitle>
                                <p className="text-xs font-mono opacity-80">{template.placid_template_uuid}</p>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <Label className="text-gray-700 font-medium">Price (KSh) *</Label>
                                    <Input
                                        type="number"
                                        value={template.price || ""}
                                        onChange={(e) =>
                                            updateTemplate(template.id, "price", Number(e.target.value))
                                        }
                                        placeholder="e.g., 50"
                                        className="border-gray-300 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <Label className="text-gray-700 font-medium">Category *</Label>
                                    <Select
                                        value={template.category || ""}
                                        onValueChange={(value) => updateTemplate(template.id, "category", value)}
                                    >
                                        <SelectTrigger className="border-gray-300 focus:border-blue-500">
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

                                <div>
                                    <Label className="text-gray-700 font-medium">Tags (Optional)</Label>
                                    <Input
                                        value={template.tags?.[0] || ""}
                                        onChange={(e) =>
                                            updateTemplate(template.id, "tags", e.target.value ? [e.target.value] : null)
                                        }
                                        placeholder="e.g., New, Popular"
                                        className="border-gray-300 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <Label className="text-gray-700 font-medium">Thumbnail URL</Label>
                                    <Input
                                        value={template.thumbnail_url || ""}
                                        onChange={(e) => updateTemplate(template.id, "thumbnail_url", e.target.value)}
                                        placeholder="https://..."
                                        className="border-gray-300 focus:border-blue-500"
                                    />
                                </div>

                                <div className="pt-2">
                                    <Badge
                                        variant={template.price && template.category ? "default" : "destructive"}
                                        className="text-xs"
                                    >
                                        {template.price && template.category ? "✅ Ready" : "⚠️ Incomplete"}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
