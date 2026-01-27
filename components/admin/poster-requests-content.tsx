"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, CheckCircle2, RefreshCw, Phone, Clock, FileText, ExternalLink } from "lucide-react"
import { supabaseAdmin, showToast, type PosterRequest } from "@/lib/supabase"
import RippleLoader from "@/components/ui/ripple-loader"

export default function PosterRequestsContent() {
  const [requests, setRequests] = useState<PosterRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchRequests()

    // Real-time subscription
    const channel = supabaseAdmin
      .channel("realtime:poster_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poster_requests" },
        () => {
          fetchRequests(false)
        }
      )
      .subscribe()

    return () => {
      supabaseAdmin.removeChannel(channel)
    }
  }, [])

  const fetchRequests = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      const { data, error } = await supabaseAdmin
        .from("poster_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error: any) {
      showToast(`Failed to fetch requests: ${error.message}`, "error")
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRequests(false)
    setRefreshing(false)
    showToast("Requests refreshed", "success")
  }

  const handleStatusUpdate = async (id: string, newStatus: "pending" | "added" | "ignored") => {
    try {
      const { error } = await supabaseAdmin
        .from("poster_requests")
        .update({ status: newStatus })
        .eq("id", id)

      if (error) throw error
      showToast(`Status updated to ${newStatus}`, "success")
    } catch (error: any) {
      showToast(`Failed to update status: ${error.message}`, "error")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return

    try {
      const { error } = await supabaseAdmin
        .from("poster_requests")
        .delete()
        .eq("id", id)

      if (error) throw error
      showToast("Request deleted successfully", "success")
    } catch (error: any) {
      showToast(`Failed to delete request: ${error.message}`, "error")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "added":
        return <Badge className="bg-success text-white">Added</Badge>
      case "ignored":
        return <Badge variant="secondary">Ignored</Badge>
      default:
        return <Badge className="bg-amber-500 text-white shadow-sm">Pending</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RippleLoader size={80} color="#2563eb" />
        <p className="mt-4 text-gray-500 font-inter">Loading requests...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-space">Poster Requests</h2>
          <p className="text-sm text-gray-500 font-inter">Manage user requests for new poster templates</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="border-primary/40 text-primary hover:bg-primary/10"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-500 font-inter">No poster requests found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="overflow-hidden border-white/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="w-full md:w-48 h-48 md:h-auto bg-gray-100 relative group">
                  <img 
                    src={request.poster_url} 
                    alt="Requested Poster" 
                    className="w-full h-full object-contain"
                  />
                  <a 
                    href={request.poster_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <ExternalLink className="w-6 h-6" />
                  </a>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(request.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {request.status === "pending" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-success border-success/20 hover:bg-success/5"
                          onClick={() => handleStatusUpdate(request.id, "added")}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Mark Added
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDelete(request.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <FileText className="w-4 h-4 text-primary" />
                        Description
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {request.description || "No description provided."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Phone className="w-4 h-4 text-primary" />
                        Contact Info
                      </div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center gap-2">
                        {request.phone_number ? (
                          <>
                            <span className="font-mono">{request.phone_number}</span>
                            <a 
                              href={`tel:${request.phone_number}`}
                              className="text-xs text-primary hover:underline"
                            >
                              Call
                            </a>
                          </>
                        ) : (
                          "No phone number provided."
                        )}
                      </div>
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex justify-end pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-gray-500 hover:text-gray-700 border-gray-200"
                        onClick={() => handleStatusUpdate(request.id, "ignored")}
                      >
                        Ignore Request
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
