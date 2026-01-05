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
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })
      const data = await res.json().catch(() => ({ success: false }))
      if (res.ok && data?.success) {
        router.push("/admin")
      } else {
        const msg = data?.error || "Invalid credentials"
        setError(msg)
      }
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-app relative overflow-hidden flex items-center justify-center section-fade-in transition-smooth">
      {/* Ultra-futuristic background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.08)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Login Card */}
      <Card 
        className="p-8 w-full max-w-md animate-fadeUp relative z-10"
        style={{
          background: "linear-gradient(0deg, rgba(170, 103, 230, 1) 0%, rgba(26, 189, 110, 1) 100%)",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        }}
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mx-auto mb-4">
            <img src="/logo.svg" alt="Bingwa Logo" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white font-space mb-2 drop-shadow-md">Admin Portal</h1>
          <p className="text-white/90 font-inter font-medium">Access PosterGen Admin Dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/20 border border-danger rounded-lg animate-fadeUp">
            <p className="text-danger text-sm font-inter">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-text-primary font-space flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Email Address
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              placeholder="Enter your email"
              className="font-inter"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-text-primary font-space flex items-center">
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
                className="font-inter pr-12"
              />
              <Button
                type="button"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-text-primary hover:text-text-secondary transition-colors duration-300 h-8 w-8 bg-transparent hover:bg-app-elevated rounded-md"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-hover text-text-inverse py-3 text-lg font-semibold font-space"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
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
