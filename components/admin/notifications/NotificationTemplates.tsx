"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { NotificationType } from "@/lib/notifications/types"
import { FileText, Plus, Edit2, Save, X, Info, Mail, MessageSquare, Sparkles, Copy, Check } from "lucide-react"

interface NotificationTemplate {
    id: string
    notification_type: string
    channel: "email" | "sms"
    subject?: string
    body: string
    created_at: string
    updated_at: string
}

// Comprehensive available variables for each notification type
const TEMPLATE_VARIABLES: Record<string, { variable: string; description: string }[]> = {
    ADMIN_LOGIN: [
        { variable: "email", description: "Admin email address" },
        { variable: "time", description: "Login timestamp" },
        { variable: "ip", description: "IP address" },
        { variable: "location", description: "Login location (if available)" },
    ],
    TEMPLATE_CREATED: [
        { variable: "template_name", description: "Name of the template" },
        { variable: "template_id", description: "Template ID" },
        { variable: "creator_name", description: "Creator's name" },
        { variable: "creator_email", description: "Creator's email" },
        { variable: "time", description: "Creation timestamp" },
        { variable: "category", description: "Template category" },
    ],
    POSTER_GENERATED: [
        { variable: "template_name", description: "Template used" },
        { variable: "template_id", description: "Template ID" },
        { variable: "user_email", description: "User's email" },
        { variable: "user_phone", description: "User's phone number" },
        { variable: "time", description: "Generation timestamp" },
        { variable: "poster_id", description: "Generated poster ID" },
    ],
    POSTER_GENERATION_FAILED: [
        { variable: "template_name", description: "Template attempted" },
        { variable: "template_id", description: "Template ID" },
        { variable: "user_email", description: "User's email" },
        { variable: "user_phone", description: "User's phone number" },
        { variable: "engine", description: "Generation engine (Placid/AI)" },
        { variable: "error", description: "Error message" },
        { variable: "time", description: "Failure timestamp" },
        { variable: "poster_id", description: "Failed poster ID" },
    ],
    PAYMENT_SUCCESS: [
        { variable: "amount", description: "Payment amount (KSh)" },
        { variable: "transaction_id", description: "M-Pesa transaction ID" },
        { variable: "phone", description: "Phone number" },
        { variable: "time", description: "Payment timestamp" },
        { variable: "receipt_number", description: "Receipt number" },
        { variable: "template_name", description: "Template purchased for" },
    ],
    PAYMENT_FAILED: [
        { variable: "amount", description: "Attempted amount (KSh)" },
        { variable: "phone", description: "Phone number" },
        { variable: "reason", description: "Failure reason" },
        { variable: "time", description: "Attempt timestamp" },
        { variable: "reference", description: "Transaction reference" },
    ],
    POSTER_DOWNLOADED: [
        { variable: "template_name", description: "Template name" },
        { variable: "poster_id", description: "Poster ID" },
        { variable: "user_email", description: "User's email" },
        { variable: "user_phone", description: "User's phone" },
        { variable: "time", description: "Download timestamp" },
        { variable: "download_count", description: "Total downloads" },
    ],
    POSTER_REVIEW_SUBMITTED: [
        { variable: "template_name", description: "Template reviewed" },
        { variable: "rating", description: "Star rating (1-5)" },
        { variable: "user_email", description: "Reviewer's email" },
        { variable: "user_phone", description: "Reviewer's phone" },
        { variable: "comment", description: "Review comment" },
        { variable: "time", description: "Review timestamp" },
    ],
}

export default function NotificationTemplates() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [editingTemplate, setEditingTemplate] = useState<Partial<NotificationTemplate> | null>(null)
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [copiedVariable, setCopiedVariable] = useState<string | null>(null)

    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("notification_templates")
                .select("*")
                .order("notification_type", { ascending: true })
                .order("channel", { ascending: true })

            if (error) throw error
            setTemplates(data || [])
        } catch (error) {
            console.error("Failed to load templates:", error)
        } finally {
            setLoading(false)
        }
    }

    const saveTemplate = async () => {
        if (!editingTemplate) return

        try {
            if (editingTemplate.id) {
                // Update existing template
                const { error } = await supabase
                    .from("notification_templates")
                    .update({
                        subject: editingTemplate.subject,
                        body: editingTemplate.body,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", editingTemplate.id)

                if (error) throw error
            } else {
                // Create new template
                const { error } = await supabase.from("notification_templates").insert({
                    notification_type: editingTemplate.notification_type,
                    channel: editingTemplate.channel,
                    subject: editingTemplate.subject,
                    body: editingTemplate.body,
                })

                if (error) throw error
            }

            setEditingTemplate(null)
            loadTemplates()
        } catch (error) {
            console.error("Failed to save template:", error)
            alert("Failed to save template")
        }
    }

    const deleteTemplate = async (id: string) => {
        if (!confirm("Are you sure you want to delete this template?")) return

        try {
            const { error } = await supabase.from("notification_templates").delete().eq("id", id)

            if (error) throw error
            loadTemplates()
        } catch (error) {
            console.error("Failed to delete template:", error)
            alert("Failed to delete template")
        }
    }

    const copyVariable = (variable: string) => {
        navigator.clipboard.writeText(`{{${variable}}}`)
        setCopiedVariable(variable)
        setTimeout(() => setCopiedVariable(null), 2000)
    }

    const groupedTemplates = templates.reduce((acc, template) => {
        const key = template.notification_type
        if (!acc[key]) acc[key] = []
        acc[key].push(template)
        return acc
    }, {} as Record<string, NotificationTemplate[]>)

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg animate-pulse"></div>
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-purple-500/20 rounded animate-pulse"></div>
                            <div className="h-4 w-80 bg-purple-500/10 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-64 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#2595df]">Message Templates</h2>
                        <p className="text-sm text-[#2595df]">
                            Craft dynamic notification messages for every event
                        </p>
                    </div>
                </div>

                <button
                    onClick={() =>
                        setEditingTemplate({
                            notification_type: NotificationType.ADMIN_LOGIN,
                            channel: "sms",
                            body: "",
                        })
                    }
                    className="px-5 py-2.5 bg-[#2595df] hover:bg-[#2595df]/80 text-white rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg shadow-purple-500/30 font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Create Template
                </button>
            </div>

            {/* Event Type Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.values(NotificationType).map((type) => {
                    const typeTemplates = groupedTemplates[type] || []
                    const isSelected = selectedType === type
                    const smsTemplate = typeTemplates.find((t) => t.channel === "sms")
                    const emailTemplate = typeTemplates.find((t) => t.channel === "email")

                    return (
                        <button
                            key={type}
                            onClick={() => setSelectedType(isSelected ? null : type)}
                            className={`group relative p-5 rounded-xl border-2 transition-all duration-300 text-left ${isSelected
                                ? "border-[#2595df] bg-[#2595df] shadow-lg shadow-[#2595df]/50 scale-105"
                                : "border-zinc-700 bg-zinc-800 hover:border-[#2595df] hover:bg-zinc-700 hover:shadow-md hover:shadow-[#2595df]/30"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <FileText className={`w-5 h-5 transition-colors ${isSelected ? "text-white" : "text-zinc-400 group-hover:text-[#2595df]"}`} />
                                <div className="flex gap-1.5">
                                    {smsTemplate && (
                                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center" title="SMS template exists">
                                            <MessageSquare className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}
                                    {emailTemplate && (
                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center" title="Email template exists">
                                            <Mail className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <h3 className={`font-semibold mb-1 capitalize text-sm ${isSelected ? "text-white" : "text-white group-hover:text-white"}`}>
                                {type.replace(/_/g, " ").toLowerCase()}
                            </h3>
                            <p className={`text-xs ${isSelected ? "text-white/90" : "text-zinc-400 group-hover:text-zinc-300"}`}>
                                {typeTemplates.length} template{typeTemplates.length !== 1 ? "s" : ""}
                            </p>
                        </button>
                    )
                })}
            </div>

            {/* Selected Type Details */}
            {selectedType && (
                <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-b border-zinc-800 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white capitalize mb-1">
                                    {selectedType.replace(/_/g, " ").toLowerCase()}
                                </h3>
                                <p className="text-sm text-zinc-400">Configure message templates for this event</p>
                            </div>
                            <button
                                onClick={() => setSelectedType(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Available Variables */}
                        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-blue-300 mb-2">
                                        Available Dynamic Variables
                                    </p>
                                    <p className="text-xs text-blue-200/70 mb-3">
                                        Click to copy • Use these in your message templates
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {TEMPLATE_VARIABLES[selectedType]?.map(({ variable, description }) => (
                                    <button
                                        key={variable}
                                        onClick={() => copyVariable(variable)}
                                        className="group flex items-center justify-between p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-lg transition-all duration-200"
                                    >
                                        <div className="flex-1 text-left">
                                            <code className="text-sm font-mono text-blue-300">
                                                {`{{${variable}}}`}
                                            </code>
                                            <p className="text-xs text-blue-200/60 mt-0.5">{description}</p>
                                        </div>
                                        {copiedVariable === variable ? (
                                            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Templates Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* SMS Template */}
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-green-900/40 to-green-800/40 border-b border-zinc-700 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-5 h-5 text-green-400" />
                                            <h4 className="font-semibold text-white">SMS Template</h4>
                                        </div>
                                        <span className="px-2.5 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium border border-green-500/30">
                                            160 chars max
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    {groupedTemplates[selectedType]?.find((t) => t.channel === "sms") ? (
                                        <div>
                                            <p className="text-sm text-zinc-300 whitespace-pre-wrap mb-4 font-mono bg-black/30 p-3 rounded-lg">
                                                {groupedTemplates[selectedType].find((t) => t.channel === "sms")?.body}
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() =>
                                                        setEditingTemplate(
                                                            groupedTemplates[selectedType].find((t) => t.channel === "sms")
                                                        )
                                                    }
                                                    className="flex-1 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        deleteTemplate(
                                                            groupedTemplates[selectedType].find((t) => t.channel === "sms")!.id
                                                        )
                                                    }
                                                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-all duration-200"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                                            <p className="text-sm text-zinc-400 mb-4">No SMS template created</p>
                                            <button
                                                onClick={() =>
                                                    setEditingTemplate({
                                                        notification_type: selectedType,
                                                        channel: "sms",
                                                        body: "",
                                                    })
                                                }
                                                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Create SMS Template
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Email Template */}
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/40 border-b border-zinc-700 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-5 h-5 text-blue-400" />
                                            <h4 className="font-semibold text-white">Email Template</h4>
                                        </div>
                                        <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
                                            Subject + Body
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    {groupedTemplates[selectedType]?.find((t) => t.channel === "email") ? (
                                        <div>
                                            <div className="mb-3">
                                                <p className="text-xs text-zinc-500 mb-1">Subject</p>
                                                <p className="text-sm text-white font-medium bg-black/30 p-2 rounded">
                                                    {groupedTemplates[selectedType].find((t) => t.channel === "email")?.subject}
                                                </p>
                                            </div>
                                            <div className="mb-4">
                                                <p className="text-xs text-zinc-500 mb-1">Body</p>
                                                <p className="text-sm text-zinc-300 whitespace-pre-wrap font-mono bg-black/30 p-3 rounded-lg max-h-40 overflow-y-auto">
                                                    {groupedTemplates[selectedType].find((t) => t.channel === "email")?.body}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() =>
                                                        setEditingTemplate(
                                                            groupedTemplates[selectedType].find((t) => t.channel === "email")
                                                        )
                                                    }
                                                    className="flex-1 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        deleteTemplate(
                                                            groupedTemplates[selectedType].find((t) => t.channel === "email")!.id
                                                        )
                                                    }
                                                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-all duration-200"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Mail className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                                            <p className="text-sm text-zinc-400 mb-4">No email template created</p>
                                            <button
                                                onClick={() =>
                                                    setEditingTemplate({
                                                        notification_type: selectedType,
                                                        channel: "email",
                                                        subject: "",
                                                        body: "",
                                                    })
                                                }
                                                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Create Email Template
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Create Template Modal */}
            {editingTemplate && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${editingTemplate.channel === "email"
                                ? "bg-gradient-to-br from-blue-600 to-blue-500"
                                : "bg-gradient-to-br from-green-600 to-green-500"
                                }`}>
                                {editingTemplate.channel === "email" ? (
                                    <Mail className="w-6 h-6 text-white" />
                                ) : (
                                    <MessageSquare className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white">
                                    {editingTemplate.id ? "Edit Template" : "Create New Template"}
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    {editingTemplate.channel?.toUpperCase()} • {editingTemplate.notification_type?.replace(/_/g, " ")}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingTemplate(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Notification Type */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Event Type</label>
                                <select
                                    value={editingTemplate.notification_type || ""}
                                    onChange={(e) =>
                                        setEditingTemplate({
                                            ...editingTemplate,
                                            notification_type: e.target.value,
                                        })
                                    }
                                    disabled={!!editingTemplate.id}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {Object.values(NotificationType).map((type) => (
                                        <option key={type} value={type}>
                                            {type.replace(/_/g, " ")}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Channel */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Channel</label>
                                <select
                                    value={editingTemplate.channel || "sms"}
                                    onChange={(e) =>
                                        setEditingTemplate({
                                            ...editingTemplate,
                                            channel: e.target.value as "email" | "sms",
                                        })
                                    }
                                    disabled={!!editingTemplate.id}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="email">📧 Email</option>
                                    <option value="sms">📱 SMS</option>
                                </select>
                            </div>

                            {/* Subject (Email only) */}
                            {editingTemplate.channel === "email" && (
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">Subject Line</label>
                                    <input
                                        type="text"
                                        placeholder="Email subject line"
                                        value={editingTemplate.subject || ""}
                                        onChange={(e) =>
                                            setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                                        }
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            )}

                            {/* Body */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Message Body
                                    {editingTemplate.channel === "sms" && (
                                        <span className="ml-2 text-xs text-zinc-500">
                                            ({editingTemplate.body?.length || 0}/160)
                                        </span>
                                    )}
                                </label>
                                <textarea
                                    placeholder={`Use variables like {{${TEMPLATE_VARIABLES[editingTemplate.notification_type || "ADMIN_LOGIN"]?.[0]?.variable ||
                                        "variable"
                                        }}}`}
                                    value={editingTemplate.body || ""}
                                    onChange={(e) =>
                                        setEditingTemplate({ ...editingTemplate, body: e.target.value })
                                    }
                                    rows={editingTemplate.channel === "sms" ? 4 : 8}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={saveTemplate}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 font-medium"
                            >
                                <Save className="w-5 h-5" />
                                Save Template
                            </button>
                            <button
                                onClick={() => setEditingTemplate(null)}
                                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
