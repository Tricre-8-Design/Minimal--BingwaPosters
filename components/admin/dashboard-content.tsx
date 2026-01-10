"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Eye,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface DashboardStats {
  totalPosters: number
  totalRevenue: number
  filteredPosters: number
  filteredRevenue: number
}

interface TopTemplate {
  template_name: string
  template_id: string
  usage_count: number
  revenue: number
}

interface DailyPosterData {
  date: string
  count: number
}

interface Poster {
  id: string
  template_name: string
  template_id: string
  created_at: string
  time?: string
}

interface Payment {
  id: string
  amount: number
  status: string
  created_at: string
  time?: string
}

export default function DashboardContent() {
  const [posters, setPosters] = useState<Poster[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [topTemplates, setTopTemplates] = useState<TopTemplate[]>([])
  const [dailyData, setDailyData] = useState<DailyPosterData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today")
  const [isLoading, setIsLoading] = useState(true)

  // Helper functions for date filtering
  const getDateRange = (period: "today" | "week" | "month") => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (period) {
      case "today":
        return today
      case "week":
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return weekAgo
      case "month":
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return monthAgo
    }
  }

  const isInPeriod = (dateString: string, period: "today" | "week" | "month") => {
    const itemDate = new Date(dateString)
    const rangeStart = getDateRange(period)
    return itemDate >= rangeStart
  }

  // Calculate stats based on selected period
  const stats = useMemo<DashboardStats>(() => {
    const totalPosters = posters.length
    const totalRevenue = payments
      .filter(p => p.status === "Paid")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const filteredPosters = posters.filter(p =>
      isInPeriod(p.created_at || p.time || "", selectedPeriod)
    ).length

    const filteredRevenue = payments
      .filter(p => p.status === "Paid" && isInPeriod(p.created_at || p.time || "", selectedPeriod))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    return {
      totalPosters,
      totalRevenue,
      filteredPosters,
      filteredRevenue,
    }
  }, [posters, payments, selectedPeriod])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)

        const { data: postersData, error: postersError } = await supabase
          .from("generated_posters")
          .select("*")

        if (postersError) throw postersError

        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("*")

        if (paymentsError) throw paymentsError

        setPosters(postersData || [])
        setPayments(paymentsData || [])

        // Calculate top templates
        const templateUsage =
          postersData?.reduce(
            (acc, poster) => {
              const key = poster.template_name
              if (!acc[key]) {
                acc[key] = {
                  template_name: poster.template_name,
                  template_id: poster.template_id,
                  usage_count: 0,
                  revenue: 0,
                }
              }
              acc[key].usage_count++
              acc[key].revenue += 25
              return acc
            },
            {} as Record<string, TopTemplate>,
          ) || {}

        const topTemplatesArray = Object.values(templateUsage)
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 5)

        setTopTemplates(topTemplatesArray)

        // Group by date
        const grouped: Record<string, number> = {}
        postersData?.forEach((poster) => {
          const date = (poster.created_at || poster.time || "").split("T")[0]
          grouped[date] = (grouped[date] || 0) + 1
        })

        // Convert to array and sort
        const data = Object.entries(grouped)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-30) // Last 30 days

        setDailyData(data)
      } catch (error) {
        console.error("Dashboard load error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()

    const postersChannel = supabase
      .channel("posters-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_posters" }, () => {
        loadDashboardData()
      })
      .subscribe()

    const paymentsChannel = supabase
      .channel("payments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        loadDashboardData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(postersChannel)
      supabase.removeChannel(paymentsChannel)
    }
  }, [])

  const getPeriodLabel = (period: "today" | "week" | "month") => {
    switch (period) {
      case "today": return "Today's"
      case "week": return "This Week's"
      case "month": return "This Month's"
    }
  }

  // Bar colors
  const BAR_COLORS = ["#2595df", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-zinc-400">Loading live data...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800 p-6 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded mb-2"></div>
              <div className="h-8 bg-zinc-800 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Posters */}
        <Card className="bg-zinc-900 border-2 border-zinc-800 p-6 hover:border-[#2595df] transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Generated Posters</p>
                <p className="text-3xl font-bold text-white">{stats.totalPosters}</p>
              </div>
              <div className="w-12 h-12 bg-[#2595df] rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Revenue with Period Filter */}
        <Card className="bg-zinc-900 border-2 border-zinc-800 p-6 hover:border-green-500 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">{getPeriodLabel(selectedPeriod)} Revenue</p>
                <p className="text-3xl font-bold text-white">KSh {stats.filteredRevenue}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              {(["today", "week", "month"] as const).map((period) => (
                <Button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${selectedPeriod === period
                      ? "bg-green-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                >
                  {period === "today" ? "Today" : period === "week" ? "Week" : "Month"}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Filtered Posters with Period Filter */}
        <Card className="bg-zinc-900 border-2 border-zinc-800 p-6 hover:border-blue-500 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">{getPeriodLabel(selectedPeriod)} Posters</p>
                <p className="text-3xl font-bold text-white">{stats.filteredPosters}</p>
                <p className="text-xs text-green-400 mt-1">Period activity</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              {(["today", "week", "month"] as const).map((period) => (
                <Button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${selectedPeriod === period
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                >
                  {period === "today" ? "Today" : period === "week" ? "Week" : "Month"}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900 border-2 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-[#2595df]" />
                Daily Poster Generation Trends
              </h2>
              <div className="flex items-center space-x-2 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>

            <div className="w-full h-80">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: '#9ca3af' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                        color: "#fff"
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {dailyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <BarChart3 className="w-12 h-12 text-zinc-600 mb-4" />
                  <p className="text-zinc-400">No daily data available yet</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Top Templates */}
        <div>
          <Card className="bg-zinc-900 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              Top 5 Templates
            </h2>

            <div className="space-y-3">
              {topTemplates.length > 0 ? (
                topTemplates.map((template, index) => (
                  <div
                    key={template.template_id}
                    className="flex items-center justify-between p-4 bg-zinc-800 border border-zinc-700 rounded-xl hover:border-green-500 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 ${index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-600' :
                              'bg-zinc-600'
                        }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{template.template_name}</p>
                        <p className="text-xs text-zinc-400">
                          {template.usage_count} uses • KSh {template.revenue}
                        </p>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-[#2595df] flex-shrink-0 ml-2" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No template data yet</p>
                  <p className="text-sm text-zinc-500">Popular templates will appear here</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
