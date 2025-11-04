"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Lock, Mail, Eye, EyeOff, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError("")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Mock authentication - replace with real Supabase auth
      await new Promise((resolve) => setTimeout(resolve, 1500))

      if (formData.email === "admin@postergen.com" && formData.password === "admin123") {
        // Store auth token
        localStorage.setItem("admin_token", "authenticated")
        router.push("/admin")
      } else {
        setError("Invalid credentials. Please try again.")
      }
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center">
      {/* Ultra-futuristic background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Login Card */}
      <Card className="glass p-8 w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-1000 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4 neon-purple animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white font-space mb-2">Admin Portal</h1>
          <p className="text-blue-200 font-inter">Access PosterGen Admin Dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-lg animate-in fade-in-0 slide-in-from-top-4 duration-500">
            <p className="text-red-400 text-sm font-inter">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white font-space flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Email Address
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              placeholder="admin@postergen.com"
              className="glass text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white font-space flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              Password
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                placeholder="Enter your password"
                className="glass text-white placeholder-blue-300 border-white/20 focus:border-purple-400 focus:neon-purple transition-all duration-300 font-inter pr-12"
              />
              <Button
                type="button"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-white hover:text-blue-300 transition-colors duration-300 h-8 w-8 bg-transparent hover:bg-white/10 rounded-md"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 btn-interactive neon-purple py-3 text-lg font-semibold font-space"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Authenticating...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Login to Dashboard
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center"></div>
      </Card>
    </div>
  )
}
