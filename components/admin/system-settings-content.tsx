"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Wrench, Zap, AlertCircle, CheckCircle2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface MaintenanceSettings {
    placid: {
        enabled: boolean
        message: string
    }
    ai: {
        enabled: boolean
        message: string
    }
}

export default function SystemSettingsContent() {
    const [settings, setSettings] = useState<MaintenanceSettings>({
        placid: {
            enabled: false,
            message: "Classic poster generation is temporarily unavailable for maintenance. Please try again later.",
        },
        ai: {
            enabled: false,
            message: "AI poster generation is temporarily unavailable for maintenance. Please try again later.",
        },
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<"placid" | "ai" | null>(null)
    const [saveStatus, setSaveStatus] = useState<{ placid?: string; ai?: string }>({})

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/admin/system-settings")
            const data = await response.json()

            if (data.success && data.settings) {
                const placidSetting = data.settings.find((s: any) => s.setting_key === "maintenance_placid")
                const aiSetting = data.settings.find((s: any) => s.setting_key === "maintenance_ai")

                if (placidSetting) {
                    setSettings((prev) => ({
                        ...prev,
                        placid: placidSetting.setting_value,
                    }))
                }

                if (aiSetting) {
                    setSettings((prev) => ({
                        ...prev,
                        ai: aiSetting.setting_value,
                    }))
                }
            }
        } catch (error) {
            console.error("Error loading settings:", error)
        } finally {
            setLoading(false)
        }
    }

    const updateSetting = async (engine: "placid" | "ai") => {
        try {
            setSaving(engine)
            setSaveStatus((prev) => ({ ...prev, [engine]: "" }))

            const response = await fetch("/api/admin/system-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    setting_key: `maintenance_${engine}`,
                    setting_value: settings[engine],
                    updated_by: "admin",
                }),
            })

            const data = await response.json()

            if (data.success) {
                setSaveStatus((prev) => ({ ...prev, [engine]: "success" }))
                setTimeout(() => {
                    setSaveStatus((prev) => ({ ...prev, [engine]: "" }))
                }, 3000)
            } else {
                setSaveStatus((prev) => ({ ...prev, [engine]: "error" }))
            }
        } catch (error) {
            console.error(`Error updating ${engine} settings:`, error)
            setSaveStatus((prev) => ({ ...prev, [engine]: "error" }))
        } finally {
            setSaving(null)
        }
    }

    const toggleMaintenance = (engine: "placid" | "ai", enabled: boolean) => {
        setSettings((prev) => ({
            ...prev,
            [engine]: {
                ...prev[engine],
                enabled,
            },
        }))
    }

    const updateMessage = (engine: "placid" | "ai", message: string) => {
        setSettings((prev) => ({
            ...prev,
            [engine]: {
                ...prev[engine],
                message,
            },
        }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-text-secondary">Loading settings...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#ff490d] mb-2">System Settings</h2>
                <p className="text-text-secondary">
                    Control maintenance mode for different poster generation engines. When enabled, users will be blocked from
                    using the specific engine.
                </p>
            </div>

            {/* Placid Engine Settings */}
            <Card className="bg-surface/40 border-white/10 p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-500/20">
                            <Wrench className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-[#2595df]">Placid Engine</h3>
                            <p className="text-sm text-text-secondary">Template-based poster generation</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Label htmlFor="placid-maintenance" className="text-white font-medium">
                            {settings.placid.enabled ? "Maintenance ON" : "Maintenance OFF"}
                        </Label>
                        <Switch
                            id="placid-maintenance"
                            checked={settings.placid.enabled}
                            onCheckedChange={(enabled) => toggleMaintenance("placid", enabled)}
                            className="data-[state=checked]:bg-orange-500"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="placid-message" className="text-[#2595df] mb-2 block">
                            Maintenance Message
                        </Label>
                        <Textarea
                            id="placid-message"
                            value={settings.placid.message}
                            onChange={(e) => updateMessage("placid", e.target.value)}
                            placeholder="Enter the message users will see..."
                            className="bg-background/50 border-white/10 text-white min-h-[100px]"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {saveStatus.placid === "success" && (
                                <div className="flex items-center gap-2 text-green-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-sm">Saved successfully</span>
                                </div>
                            )}
                            {saveStatus.placid === "error" && (
                                <div className="flex items-center gap-2 text-red-400">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">Failed to save</span>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={() => updateSetting("placid")}
                            disabled={saving === "placid"}
                            className="bg-primary hover:bg-primary-dark"
                        >
                            {saving === "placid" ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>

                    {settings.placid.enabled && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-orange-300 font-medium">Our Poster Studio is Under Maintenance</p>
                                <p className="text-orange-200/80 text-sm mt-1">
                                    <strong>Our pre-designed poster templates are temporarily unavailable while we improve performance and reliability.</strong> <br />
                                    <br />
                                    You can still generate posters instantly using AI Posters, fully customizable to your business needs.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* AI Engine Settings */}
            <Card className="bg-surface/40 border-white/10 p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-purple-500/20">
                            <Zap className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-[#26de7e]">AI Engine</h3>
                            <p className="text-sm text-text-secondary">AI-powered poster generation</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Label htmlFor="ai-maintenance" className="text-white font-medium">
                            {settings.ai.enabled ? "Maintenance ON" : "Maintenance OFF"}
                        </Label>
                        <Switch
                            id="ai-maintenance"
                            checked={settings.ai.enabled}
                            onCheckedChange={(enabled) => toggleMaintenance("ai", enabled)}
                            className="data-[state=checked]:bg-orange-500"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="ai-message" className="text-[#26de7e] mb-2 block">
                            Maintenance Message
                        </Label>
                        <Textarea
                            id="ai-message"
                            value={settings.ai.message}
                            onChange={(e) => updateMessage("ai", e.target.value)}
                            placeholder="Enter the message users will see..."
                            className="bg-background/50 border-white/10 text-white min-h-[100px]"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {saveStatus.ai === "success" && (
                                <div className="flex items-center gap-2 text-green-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-sm">Saved successfully</span>
                                </div>
                            )}
                            {saveStatus.ai === "error" && (
                                <div className="flex items-center gap-2 text-red-400">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">Failed to save</span>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={() => updateSetting("ai")}
                            disabled={saving === "ai"}
                            className="bg-primary hover:bg-primary-dark"
                        >
                            {saving === "ai" ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>

                    {settings.ai.enabled && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-orange-300 font-medium">AI Poster Studio is Under Maintenance</p>
                                <p className="text-orange-200/80 text-sm mt-1">
                                    <strong>AI-generated posters are currently undergoing upgrades for better consistency and quality.</strong> <br />
                                    <br />
                                    In the meantime, you can continue creating professional posters using our ready-made templates.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
