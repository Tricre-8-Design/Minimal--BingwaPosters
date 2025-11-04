"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, DollarSign, Calendar, Phone, MoreVertical } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Transaction {
  id: string
  phone_number: string
  status: "Paid" | "Pending" | "Failed"
  time: string
  amount: number
}

export default function TransactionsContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase.from("payments").select("*").order("time", { ascending: false })

        if (error) throw error

        const formattedData =
          data?.map((payment) => ({
            id: payment.phone_number + payment.time,
            phone_number: payment.phone_number,
            status: payment.status,
            time: payment.time,
            amount: 50, // Fixed amount per transaction
          })) || []

        setTransactions(formattedData)
      } catch (error) {
        console.error("Error loading transactions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTransactions()
  }, [])

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.phone_number.includes(searchTerm) || transaction.id.includes(searchTerm)

    const matchesStatus = statusFilter === "all" || transaction.status.toLowerCase() === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      Paid: { color: "bg-green-500/20 text-green-400 border-green-400/30", label: "Paid" },
      Pending: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-400/30", label: "Pending" },
      Failed: { color: "bg-red-500/20 text-red-400 border-red-400/30", label: "Failed" },
    }

    const config = statusConfig[status] || statusConfig.Pending
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const totalRevenue = transactions.filter((t) => t.status === "Paid").reduce((sum, t) => sum + t.amount, 0)
  const totalTransactions = transactions.length
  const pendingTransactions = transactions.filter((t) => t.status === "Pending").length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-blue-200 font-inter">Loading transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card className="glass p-6 hover:neon-green transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-inter">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold text-white font-space">KSh {totalRevenue}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center neon-green">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="glass p-6 hover:neon-blue transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-inter">Total Transactions</p>
              <p className="text-2xl sm:text-3xl font-bold text-white font-space">{totalTransactions}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center neon-blue">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="glass p-6 hover:neon-purple transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-inter">Pending</p>
              <p className="text-2xl sm:text-3xl font-bold text-white font-space">{pendingTransactions}</p>
              <p className="text-xs text-yellow-400 font-inter">Awaiting payment</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center neon-purple">
              <Phone className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="glass p-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by phone number or transaction ID..."
              className="glass pl-10 text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter h-11"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", "paid", "pending", "failed"].map((status) => (
              <Button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`text-sm px-4 py-2 rounded-full transition-all capitalize ${
                  statusFilter === status
                    ? "bg-purple-500/50 text-white neon-purple"
                    : "glass bg-white/10 text-blue-200 hover:bg-white/20"
                }`}
              >
                {status === "all" ? "All Transactions" : `${status}`}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="glass p-6">
        <div className="space-y-4">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 glass rounded-lg hover:neon-purple transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-space font-semibold">{transaction.phone_number}</p>
                      <p className="text-xs text-blue-300 font-inter">{formatDate(transaction.time)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-white font-space font-semibold">KSh {transaction.amount}</p>
                    {getStatusBadge(transaction.status)}
                  </div>
                  <Button size="sm" className="glass btn-interactive text-white hover:neon-blue">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white font-space mb-2">No Transactions Found</h3>
              <p className="text-blue-200 font-inter">
                {searchTerm ? `No transactions match "${searchTerm}"` : "No transactions available yet"}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
