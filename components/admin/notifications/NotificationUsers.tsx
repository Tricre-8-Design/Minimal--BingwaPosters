"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { NotificationUser, NotificationUserSetting } from "@/lib/notifications/types"
import { NotificationType } from "@/lib/notifications/types"
import { Users, Plus, Edit2, Settings, ChevronDown, ChevronUp, Mail, MessageSquare, CheckCircle2, XCircle, Save, X } from "lucide-react"

export default function NotificationUsers() {
    const [users, setUsers] = useState<NotificationUser[]>([])
    const [loading, setLoading] = useState(true)
    const [editingUser, setEditingUser] = useState<NotificationUser | null>(null)
    const [showSettings, setShowSettings] = useState<string | null>(null)
    const [userSettings, setUserSettings] = useState<Record<string, NotificationUserSetting[]>>({})

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("notification_users")
                .select("*")
                .order("created_at", { ascending: false })

            if (error) throw error
            setUsers(data || [])
        } catch (error) {
            console.error("Failed to load users:", error)
        } finally {
            setLoading(false)
        }
    }

    const loadUserSettings = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("notification_user_settings")
                .select("*")
                .eq("user_id", userId)

            if (error) throw error
            setUserSettings((prev) => ({ ...prev, [userId]: data || [] }))
        } catch (error) {
            console.error("Failed to load user settings:", error)
        }
    }

    const saveUser = async () => {
        if (!editingUser) return

        try {
            if (editingUser.id) {
                // Update
                const { error } = await supabase
                    .from("notification_users")
                    .update({
                        name: editingUser.name,
                        role: editingUser.role,
                        email: editingUser.email,
                        phone: editingUser.phone,
                        is_active: editingUser.is_active,
                    })
                    .eq("id", editingUser.id)

                if (error) throw error
            } else {
                // Insert
                const { data: newUser, error } = await supabase.from("notification_users").insert({
                    name: editingUser.name,
                    role: editingUser.role,
                    email: editingUser.email,
                    phone: editingUser.phone,
                    is_active: editingUser.is_active,
                }).select().single()

                if (error) throw error

                // Initialize default settings for all notification types
                if (newUser) {
                    const defaultSettings = Object.values(NotificationType).map((type) => ({
                        user_id: newUser.id,
                        notification_type: type,
                        via_email: !!editingUser.email,
                        via_sms: !!editingUser.phone,
                        enabled: true,
                    }))

                    await supabase.from("notification_user_settings").insert(defaultSettings)
                }
            }

            setEditingUser(null)
            loadUsers()
        } catch (error) {
            console.error("Failed to save user:", error)
            alert("Failed to save user")
        }
    }

    const toggleSetting = async (userId: string, notificationType: string, field: "enabled" | "via_email" | "via_sms") => {
        const settings = userSettings[userId] || []
        const setting = settings.find((s) => s.notification_type === notificationType)

        if (!setting) {
            // Create new setting
            await supabase.from("notification_user_settings").insert({
                user_id: userId,
                notification_type: notificationType,
                enabled: field === "enabled",
                via_email: field === "via_email",
                via_sms: field === "via_sms",
            })
        } else {
            // Update existing
            await supabase
                .from("notification_user_settings")
                .update({
                    [field]: !setting[field],
                })
                .eq("id", setting.id)
        }

        await loadUserSettings(userId)
    }

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg animate-pulse"></div>
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-purple-500/20 rounded animate-pulse"></div>
                            <div className="h-4 w-80 bg-purple-500/10 rounded animate-pulse"></div>
                        </div>
                    </div>
                    <div className="h-10 w-32 bg-pink-500/20 rounded-lg animate-pulse"></div>
                </div>

                {/* Table Skeleton */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded-full"></div>
                                        <div className="h-6 w-32 bg-purple-500/20 rounded"></div>
                                    </div>
                                    <div className="h-6 w-24 bg-purple-500/20 rounded-full"></div>
                                    <div className="h-6 w-40 bg-purple-500/20 rounded"></div>
                                    <div className="h-6 w-20 bg-purple-500/20 rounded"></div>
                                    <div className="flex gap-2">
                                        <div className="h-8 w-8 bg-purple-500/20 rounded-lg"></div>
                                        <div className="h-8 w-8 bg-purple-500/20 rounded-lg"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#ff4b0e]">Notification Users</h2>
                        <p className="text-sm text-[#ff4b0e]">Manage who receives notifications and their preferences</p>
                    </div>
                </div>

                <button
                    onClick={() =>
                        setEditingUser({ id: "", name: "", role: "Admin", email: "", phone: "", is_active: true } as any)
                    }
                    className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-pink-500/50 font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Add User
                </button>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-800/50 border-b border-zinc-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {users.map((user) => {
                                const showUserSettings = showSettings === user.id
                                const settings = userSettings[user.id] || []

                                return (
                                    <React.Fragment key={user.id}>
                                        <tr className="hover:bg-zinc-800/50 transition-colors">
                                            {/* Name */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white font-semibold text-sm">
                                                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">{user.name}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
                                                    {user.role}
                                                </span>
                                            </td>

                                            {/* Contact */}
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {user.email && (
                                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                            <Mail className="w-4 h-4 text-zinc-500" />
                                                            {user.email}
                                                        </div>
                                                    )}
                                                    {user.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                            <MessageSquare className="w-4 h-4 text-zinc-500" />
                                                            {user.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                {user.is_active ? (
                                                    <span className="flex items-center gap-2 text-green-400">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Active</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-zinc-500">
                                                        <XCircle className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Inactive</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingUser(user)}
                                                        className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all duration-200 group"
                                                        title="Edit user"
                                                    >
                                                        <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (showUserSettings) {
                                                                setShowSettings(null)
                                                            } else {
                                                                setShowSettings(user.id)
                                                                loadUserSettings(user.id)
                                                            }
                                                        }}
                                                        className="p-2 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 rounded-lg transition-all duration-200 group"
                                                        title="Notification settings"
                                                    >
                                                        {showUserSettings ? (
                                                            <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        ) : (
                                                            <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Settings Row (Expandable) */}
                                        {showUserSettings && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-4 bg-zinc-800/30">
                                                    <div className="space-y-4">
                                                        <h4 className="font-semibold text-white flex items-center gap-2 mb-4">
                                                            <Settings className="w-4 h-4 text-purple-400" />
                                                            Notification Preferences for {user.name}
                                                        </h4>
                                                        <div className="grid gap-3">
                                                            {Object.values(NotificationType).map((type) => {
                                                                const setting = settings.find(s => s.notification_type === type)
                                                                return (
                                                                    <div
                                                                        key={type}
                                                                        className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 flex items-center justify-between"
                                                                    >
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-white capitalize">
                                                                                {type.replace(/_/g, ' ')}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={setting?.enabled || false}
                                                                                    onChange={() => toggleSetting(user.id, type, 'enabled')}
                                                                                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                                                                                />
                                                                                <span className="text-sm text-zinc-400">Enabled</span>
                                                                            </label>
                                                                            {user.email && (
                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={setting?.via_email || false}
                                                                                        onChange={() => toggleSetting(user.id, type, 'via_email')}
                                                                                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                                                                                    />
                                                                                    <Mail className="w-4 h-4 text-zinc-400" />
                                                                                    <span className="text-sm text-zinc-400">Email</span>
                                                                                </label>
                                                                            )}
                                                                            {user.phone && (
                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={setting?.via_sms || false}
                                                                                        onChange={() => toggleSetting(user.id, type, 'via_sms')}
                                                                                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                                                                                    />
                                                                                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                                                                                    <span className="text-sm text-zinc-400">SMS</span>
                                                                                </label>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal - Moved outside table */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-purple-900/95 to-black/95 border border-purple-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">{editingUser.id ? "Edit User" : "Add New User"}</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter full name"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">Role</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Admin, Creator, Ops, Marketing"
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">Email</label>
                                <input
                                    type="email"
                                    placeholder="user@example.com"
                                    value={editingUser.email || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">Phone</label>
                                <input
                                    type="tel"
                                    placeholder="+254..."
                                    value={editingUser.phone || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={editingUser.is_active}
                                            onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-600 peer-checked:to-emerald-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-purple-200">Active user</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={saveUser}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50 font-medium"
                            >
                                <Save className="w-4 h-4" />
                                Save User
                            </button>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-purple-500/30 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
