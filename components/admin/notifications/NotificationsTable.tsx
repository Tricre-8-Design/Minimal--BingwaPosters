"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { NotificationEvent, NotificationDelivery } from "@/lib/notifications/types"
import { Bell, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"

interface EventWithDeliveries extends NotificationEvent {
    deliveries?: NotificationDelivery[]
}

export default function NotificationsTable() {
    const [events, setEvents] = useState<EventWithDeliveries[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string>("all")

    useEffect(() => {
        loadEvents()
    }, [filterType])

    const loadEvents = async () => {
        setLoading(true)
        try {
            let query = supabase.from("notification_events").select("*").order("created_at", { ascending: false }).limit(50)

            if (filterType !== "all") {
                query = query.eq("notification_type", filterType)
            }

            const { data: eventsData, error } = await query

            if (error) throw error

            // Fetch deliveries for each event
            const eventsWithDeliveries = await Promise.all(
                (eventsData || []).map(async (event) => {
                    const { data: deliveries } = await supabase
                        .from("notification_deliveries")
                        .select("*")
                        .eq("event_id", event.id)

                    return { ...event, deliveries: deliveries || [] }
                }),
            )

            setEvents(eventsWithDeliveries as EventWithDeliveries[])
        } catch (error) {
            console.error("Failed to load events:", error)
        } finally {
            setLoading(false)
        }
    }

    const getDeliveryStatusSummary = (deliveries: NotificationDelivery[] = []) => {
        const sent = deliveries.filter((d) => d.status === "sent").length
        const failed = deliveries.filter((d) => d.status === "failed").length
        const pending = deliveries.filter((d) => d.status === "pending").length

        return { sent, failed, pending, total: deliveries.length }
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
                            <div className="h-4 w-72 bg-purple-500/10 rounded animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="h-10 w-32 bg-purple-500/20 rounded-lg animate-pulse"></div>
                        <div className="h-10 w-24 bg-purple-500/20 rounded-lg animate-pulse"></div>
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="bg-gradient-to-br from-purple-900/70 to-black/90 border border-purple-500/60 rounded-xl overflow-hidden backdrop-blur-md shadow-xl">
                    <div className="overflow-x-auto">
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="h-8 w-32 bg-purple-500/20 rounded-full"></div>
                                    <div className="h-8 flex-1 bg-purple-500/20 rounded"></div>
                                    <div className="h-8 w-24 bg-purple-500/20 rounded"></div>
                                    <div className="h-8 w-32 bg-purple-500/20 rounded"></div>
                                    <div className="h-8 w-20 bg-purple-500/20 rounded"></div>
                                    <div className="h-8 w-20 bg-purple-500/20 rounded-lg"></div>
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
                        <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1ABD6EFF]">Notification Events</h2>
                        <p className="text-sm text-[#1ABD6EFF]">View all notification events and their delivery status</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 bg-[#ff490d] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm"
                    >
                        <option value="all">All Types</option>
                        <option value="ADMIN_LOGIN">Admin Login</option>
                        <option value="TEMPLATE_CREATED">Template Created</option>
                        <option value="POSTER_GENERATED">Poster Generated</option>
                        <option value="POSTER_GENERATION_FAILED">Poster Generation Failed</option>
                        <option value="PAYMENT_SUCCESS">Payment Success</option>
                        <option value="PAYMENT_FAILED">Payment Failed</option>
                        <option value="POSTER_DOWNLOADED">Poster Downloaded</option>
                        <option value="POSTER_REVIEW_SUBMITTED">Review Submitted</option>
                        <option value="POSTER_REQUEST_SUBMITTED">Poster Request</option>
                    </select>

                    <button
                        onClick={loadEvents}
                        className="px-4 py-2 bg-[#1ABD6EFF] hover:bg-[#1ABD6EFF]/90 text-white rounded-lg text-sm transition-all duration-300 flex items-center gap-2 shadow-lg shadow-[#1ABD6EFF]/20"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gradient-to-br from-purple-900/70 to-black/90 border border-purple-500/60 rounded-xl overflow-hidden backdrop-blur-md shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-purple-900/80 to-pink-900/80 border-b border-purple-500/70">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-200 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-200 uppercase tracking-wider">Summary</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-200 uppercase tracking-wider">Actor</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-200 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-200 uppercase tracking-wider">Deliveries</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-purple-200 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/40">
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Bell className="w-12 h-12 text-purple-400/70" />
                                            <p className="text-purple-300">No notification events found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                events.map((event) => {
                                    const { sent, failed, pending } = getDeliveryStatusSummary(event.deliveries)
                                    const isExpanded = expandedEventId === event.id

                                    return (
                                        <>
                                            <tr key={event.id} className="hover:bg-purple-500/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-purple-600/60 to-pink-600/60 border border-purple-500/70 text-purple-200 rounded-full text-xs font-medium">
                                                        {event.notification_type.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-white font-medium max-w-md truncate">{event.summary}</td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="text-xs text-purple-300 font-medium uppercase">{event.actor_type}</div>
                                                        <div className="text-sm text-white">{event.actor_identifier || "-"}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-purple-200">
                                                    {new Date(event.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        {sent > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 bg-green-500/60 border border-green-500/80 text-green-300 rounded text-xs font-medium">
                                                                ✓ {sent}
                                                            </span>
                                                        )}
                                                        {pending > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 bg-yellow-500/60 border border-yellow-500/80 text-yellow-300 rounded text-xs font-medium">
                                                                ⏳ {pending}
                                                            </span>
                                                        )}
                                                        {failed > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 bg-red-500/60 border border-red-500/80 text-red-300 rounded text-xs font-medium">
                                                                ✗ {failed}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600/70 hover:bg-purple-600/90 border border-purple-500/70 text-purple-200 rounded-lg text-sm transition-all duration-200"
                                                    >
                                                        {isExpanded ? (
                                                            <>
                                                                <ChevronUp className="w-4 h-4" />
                                                                Hide
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown className="w-4 h-4" />
                                                                Details
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-6 bg-black/70">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <h4 className="text-sm font-semibold text-purple-200 mb-3 flex items-center gap-2">
                                                                    <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded"></span>
                                                                    Metadata
                                                                </h4>
                                                                <pre className="text-xs text-purple-100 bg-black/80 border border-purple-500/60 p-4 rounded-lg overflow-x-auto font-mono">
                                                                    {JSON.stringify(event.metadata, null, 2)}
                                                                </pre>
                                                            </div>

                                                            {event.deliveries && event.deliveries.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-purple-200 mb-3 flex items-center gap-2">
                                                                        <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded"></span>
                                                                        Deliveries ({event.deliveries.length})
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        {event.deliveries.map((delivery) => (
                                                                            <div
                                                                                key={delivery.id}
                                                                                className="bg-gradient-to-br from-purple-900/60 to-pink-900/60 border border-purple-500/60 rounded-lg p-4"
                                                                            >
                                                                                <div className="flex justify-between items-start">
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center gap-2 mb-2">
                                                                                            <span className="px-2 py-0.5 bg-purple-600/70 border border-purple-500/70 text-purple-200 rounded text-xs font-medium uppercase">
                                                                                                {delivery.channel}
                                                                                            </span>
                                                                                            <span className="text-white font-medium text-sm">
                                                                                                {delivery.channel === "email" ? "📧" : "📱"} to{" "}
                                                                                                {/* Recipient will be fetched from user table in real scenario */}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="text-purple-200 text-sm mt-1">
                                                                                            {delivery.sent_at ? (
                                                                                                <span className="text-xs text-purple-300">
                                                                                                    Sent at {new Date(delivery.sent_at).toLocaleString()}
                                                                                                </span>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    </div>
                                                                                    <span
                                                                                        className={`px-3 py-1 rounded-full text-xs font-medium ${delivery.status === "sent"
                                                                                            ? "bg-green-500/60 border border-green-500/80 text-green-300"
                                                                                            : delivery.status === "failed"
                                                                                                ? "bg-red-500/60 border border-red-500/80 text-red-300"
                                                                                                : "bg-yellow-500/60 border border-yellow-500/80 text-yellow-300"
                                                                                            }`}
                                                                                    >
                                                                                        {delivery.status}
                                                                                    </span>
                                                                                </div>
                                                                                {delivery.provider_response && delivery.status === "failed" && (
                                                                                    <div className="mt-3 pt-3 border-t border-red-500/60">
                                                                                        <p className="text-red-300 text-xs">Error: {delivery.provider_response}</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
