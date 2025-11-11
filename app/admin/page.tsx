"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, ImageIcon, MessageCircle, CreditCard } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

// Import the individual page components
import DashboardContent from "@/components/admin/dashboard-content"
import TemplatesContent from "@/components/admin/templates-content"
import FeedbackContent from "@/components/admin/feedback-content"
import TransactionsContent from "@/components/admin/transactions-content"

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard")
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)

        // Get today's date for filtering
        const today = new Date().toISOString().split("T")[0]

        // Load generated posters stats
        const { data: posters, error: postersError } = await supabase.from("generated_posters").select("*")

        if (postersError) throw postersError

        // Load payments stats
        const { data: payments, error: paymentsError } = await supabase.from("payments").select("*")

        if (paymentsError) throw paymentsError

        // Load feedback stats
        const { data: feedback, error: feedbackError } = await supabase.from("feedback").select("*")

        if (feedbackError) throw feedbackError

        // Calculate stats
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
          activeUsers: Math.floor(totalPosters * 0.7), // Estimate
          todayPosters,
          todayRevenue,
        })

        // Load recent activity
        const activities: RecentActivity[] = []

        // Add recent posters
        posters?.slice(-5).forEach((poster) => {
          activities.push({
            id: poster.id,
            type: "poster",
            description: `New poster generated: ${poster.template_name}`,
            time: poster.time,
            status: "success",
          })
        })

        // Add recent payments
        payments?.slice(-3).forEach((payment) => {
          activities.push({
            id: payment.phone_number + (payment.created_at || ""),
            type: "payment",
            description: `Payment ${payment.status.toLowerCase()}: ${payment.phone_number}`,
            time: payment.created_at || payment.time,
            status: payment.status === "Paid" ? "success" : payment.status === "Pending" ? "pending" : "failed",
          })
        })

        // Add recent feedback
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

        // Calculate top templates
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
              // Estimate revenue based on template usage
              acc[key].revenue += 25 // Average revenue per poster
              return acc
            },
            {} as Record<string, TopTemplate>,
          ) || {}

        const topTemplatesArray = Object.values(templateUsage)
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 3)

        setTopTemplates(topTemplatesArray)
      } catch (error) {
        // Silently handle dashboard data load errors to avoid leaking internals
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()

    // Set up realtime subscriptions for live updates
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
        return <ImageIcon className="w-4 h-4" />
      case "payment":
        return <MessageCircle className="w-4 h-4" />
      case "feedback":
        return <MessageCircle className="w-4 h-4" />
      default:
        return <MessageCircle className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return <MessageCircle className="w-4 h-4 text-green-400" />
      case "pending":
        return <MessageCircle className="w-4 h-4 text-yellow-400" />
      case "failed":
        return <MessageCircle className="w-4 h-4 text-red-400" />
      default:
        return <MessageCircle className="w-4 h-4 text-blue-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-space">Poster Generator Admin Panel </h1>
            <p className="text-blue-200 font-inter">Loading live data...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
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
<div className="min-h-screen site-gradient-bg relative overflow-hidden section-fade-in scroll-fade-in transition-smooth">
      {/* Ultra-futuristic background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse"></div>

        {/* Floating orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>

        {/* Scanning lines */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent h-32 animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 md:p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl flex items-center justify-center neon-purple animate-pulse">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white font-space">Bingwa Posters Admin Panel</h1>
              <p className="text-blue-200 font-inter text-sm md:text-base">Real-time poster generation analytics</p>
            </div>
          </div>

          
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <TabsList className="sticky top-0 z-50 glass grid w-full grid-cols-4 gap-2 h-auto p-1 bg-slate-900/50 border border-white/10 rounded-xl mb-6">
              <TabsTrigger
                value="dashboard"
                className="glass data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:neon-purple text-blue-200 hover:text-white transition-all duration-300 py-3 font-inter"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>

              <TabsTrigger
                value="templates"
                className="glass data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:neon-purple text-blue-200 hover:text-white transition-all duration-300 py-3 font-inter"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>

              <TabsTrigger
                value="feedback"
                className="glass data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:neon-purple text-blue-200 hover:text-white transition-all duration-300 py-3 font-inter"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Feedback</span>
              </TabsTrigger>

              <TabsTrigger
                value="transactions"
                className="glass data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:text-white data-[state=active]:neon-purple text-blue-200 hover:text-white transition-all duration-300 py-3 font-inter"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Transactions</span>
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="animate-in fade-in-0 duration-300">
              <DashboardContent stats={stats} recentActivity={recentActivity} topTemplates={topTemplates} />
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="animate-in fade-in-0 duration-300">
              <TemplatesContent />
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback" className="animate-in fade-in-0 duration-300">
              <FeedbackContent />
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="animate-in fade-in-0 duration-300">
              <TransactionsContent />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
