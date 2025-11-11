"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Clock,
  Eye,
  Activity,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DashboardStats {
  totalPosters: number
  totalRevenue: number
  avgRating: number
  activeUsers: number
  todayPosters: number
  todayRevenue: number
}

interface RecentActivity {
  id: string
  type: "poster" | "payment" | "feedback"
  description: string
  time: string
  status?: "success" | "pending" | "failed"
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

export default function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosters: 0,
    totalRevenue: 0,
    avgRating: 0,
    activeUsers: 0,
    todayPosters: 0,
    todayRevenue: 0,
  })

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [topTemplates, setTopTemplates] = useState<TopTemplate[]>([])
  const [dailyData, setDailyData] = useState<DailyPosterData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)

        const today = new Date().toISOString().split("T")[0]

        const { data: posters, error: postersError } = await supabase.from("generated_posters").select("*")

        if (postersError) throw postersError

        const { data: payments, error: paymentsError } = await supabase.from("payments").select("*")

        if (paymentsError) throw paymentsError

        const { data: feedback, error: feedbackError } = await supabase.from("feedback").select("*")

        if (feedbackError) throw feedbackError

        const totalPosters = posters?.length || 0
        const totalRevenue =
          payments?.reduce((sum, p) => sum + (p.status === "Paid" ? Number(p.amount) || 0 : 0), 0) || 0
        const avgRating = feedback?.length > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0

        const todayPosters = posters?.filter((p) => (p.created_at || p.time)?.startsWith(today)).length || 0
        const todayRevenue =
          payments
            ?.filter((p) => (p.created_at || "").startsWith(today) && p.status === "Paid")
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0

        setStats({
          totalPosters,
          totalRevenue,
          avgRating,
          activeUsers: Math.floor(totalPosters * 0.7),
          todayPosters,
          todayRevenue,
        })

        const activities: RecentActivity[] = []

        posters?.slice(-5).forEach((poster) => {
          activities.push({
            id: poster.id,
            type: "poster",
            description: `New poster generated: ${poster.template_name}`,
            time: poster.time,
            status: "success",
          })
        })

        payments?.slice(-3).forEach((payment) => {
          activities.push({
            id: payment.phone_number + (payment.created_at || ""),
            type: "payment",
            description: `Payment ${payment.status.toLowerCase()}: ${payment.phone_number}`,
            time: payment.created_at || payment.time,
            status: payment.status === "Paid" ? "success" : payment.status === "Pending" ? "pending" : "failed",
          })
        })

        feedback?.slice(-3).forEach((fb) => {
          activities.push({
            id: fb.phone_number + (fb.created_at || ""),
            type: "feedback",
            description: `${fb.rating}⭐ rating: "${fb.comment.substring(0, 50)}..."`,
            time: fb.created_at || fb.time,
            status: "success",
          })
        })

        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        setRecentActivity(activities.slice(0, 8))

        const templateUsage =
          posters?.reduce(
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
          .slice(0, 3)

        setTopTemplates(topTemplatesArray)

        // Group by date
        const grouped: Record<string, number> = {}
        posters?.forEach((poster) => {
          const date = (poster.created_at || poster.time || "").split("T")[0]
          grouped[date] = (grouped[date] || 0) + 1
        })

        // Convert to array and sort
        const data = Object.entries(grouped)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setDailyData(data)
      } catch (error) {
        // Silently handle dashboard data load errors to prevent leaking details
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

    const feedbackChannel = supabase
      .channel("feedback-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => {
        loadDashboardData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(postersChannel)
      supabase.removeChannel(paymentsChannel)
      supabase.removeChannel(feedbackChannel)
    }
  }, [])

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleString()
    } catch {
      return timeString
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "poster":
        return <BarChart3 className="w-4 h-4" />
      case "payment":
        return <DollarSign className="w-4 h-4" />
      case "feedback":
        return <MessageSquare className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <AlertCircle className="w-4 h-4 text-blue-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8 section-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-space">Dashboard</h1>
            <p className="text-blue-200 font-inter">Loading live data...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass p-6 animate-pulse">
              <div className="h-4 bg-white/20 rounded mb-2"></div>
              <div className="h-8 bg-white/20 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 section-fade-in scroll-fade-in transition-smooth">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Total Posters with Period Filter */}
        <Card className="glass p-4 sm:p-6 hover:neon-purple hover-subtle transition-smoother animate-fade-in">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-inter">Total Generated Posters</p>
                <p className="text-2xl sm:text-3xl font-bold text-white font-space">{stats.totalPosters}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl flex items-center justify-center neon-purple">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              {["Today", "This Week", "This Month"].map((period) => (
                <Button
                  key={period}
                  onClick={() => setSelectedPeriod(period.toLowerCase().replace(" ", "-") as any)}
                  className={`text-xs px-2 py-1 rounded transition-smooth ${
                    selectedPeriod === period.toLowerCase().replace(" ", "-")
                      ? "bg-purple-500/50 text-white neon-purple"
                      : "bg-white/10 text-blue-200 hover:bg-white/20"
                  }`}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Revenue with Period Filter */}
        <Card className="glass p-4 sm:p-6 hover:neon-green hover-subtle transition-smoother animate-fade-in">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-inter">Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold text-white font-space">KSh {stats.totalRevenue}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center neon-green">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              {["Today", "This Week", "This Month"].map((period) => (
                <Button
                  key={period}
                  onClick={() => setSelectedPeriod(period.toLowerCase().replace(" ", "-") as any)}
                  className={`text-xs px-2 py-1 rounded transition-smooth ${
                    selectedPeriod === period.toLowerCase().replace(" ", "-")
                      ? "bg-green-500/50 text-white neon-green"
                      : "bg-white/10 text-blue-200 hover:bg-white/20"
                  }`}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass p-4 sm:p-6 hover:neon-blue transition-all duration-500 hover:scale-105 animate-in fade-in-0 slide-in-from-top-4 duration-1000 delay-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-inter">Today's Posters</p>
                <p className="text-2xl sm:text-3xl font-bold text-white font-space">{stats.todayPosters}</p>
                <p className="text-xs text-green-400 font-inter mt-1">Daily activity</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center neon-blue">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              {["Today", "This Week", "This Month"].map((period) => (
                <Button
                  key={period}
                  onClick={() => setSelectedPeriod(period.toLowerCase().replace(" ", "-") as any)}
                  className={`text-xs px-2 py-1 rounded transition-all ${
                    selectedPeriod === period.toLowerCase().replace(" ", "-")
                      ? "bg-blue-500/50 text-white neon-blue"
                      : "bg-white/10 text-blue-200 hover:bg-white/20"
                  }`}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <Card className="glass p-4 sm:p-6 animate-in fade-in-0 slide-in-from-left-4 duration-1000 delay-400">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white font-space flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
                Daily Poster Generation Trends
              </h2>
              <div className="flex items-center space-x-2 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-inter">Live</span>
              </div>
            </div>

            <div className="w-full h-80">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(147, 51, 234, 0.3)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: "#8b5cf6", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <Activity className="w-12 h-12 text-blue-300 mx-auto" />
                  <p className="text-blue-200 font-inter">No daily data available yet</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Top Templates */}
        <div>
          <Card className="glass p-4 sm:p-6 animate-in fade-in-0 slide-in-from-right-4 duration-1000 delay-600">
            <h2 className="text-lg sm:text-xl font-bold text-white font-space mb-4 sm:mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Top Templates
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {topTemplates.length > 0 ? (
                topTemplates.map((template, index) => (
                  <div
                    key={template.template_id}
                    className="flex items-center justify-between p-3 glass rounded-lg hover:neon-green transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white text-sm font-space font-semibold">{template.template_name}</p>
                        <p className="text-xs text-blue-300 font-inter">
                          {template.usage_count} uses • KSh {template.revenue}
                        </p>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-blue-400" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                  <p className="text-blue-200 font-inter">No template data yet</p>
                  <p className="text-sm text-blue-300 font-inter">Popular templates will appear here</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
