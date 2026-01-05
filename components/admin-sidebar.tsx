"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Users,
  Star,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Type,
  ImageIcon,
  MessageCircle,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: BarChart3 },
  { name: "Templates", href: "/admin/templates", icon: ImageIcon },
  { name: "Hero Text", href: "/admin/hero", icon: Type },
  { name: "Testimonials", href: "/admin/testimonials", icon: Star },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Feedback", href: "/admin/feedback", icon: MessageCircle },
  { name: "Notifications", href: "/admin/notifications", icon: Bell },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export default function AdminSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={toggleMobileMenu}
          size="icon"
          className="bg-primary hover:bg-primary-hover text-text-inverse transition-all duration-300"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-primary/50 backdrop-blur-sm z-40" onClick={toggleMobileMenu} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-app-elevated backdrop-blur-xl border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center space-x-3 p-6 border-b border-border">
            <div className="w-10 h-10 bg-primary-soft rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-text-inverse animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary font-space">PosterGen</h1>
              <p className="text-xs text-text-secondary font-inter">Admin Panel</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start space-x-3 h-12 font-inter ${
                      isActive
                        ? "bg-primary-soft text-text-inverse border border-primary"
                        : "text-text-muted hover:text-text-primary hover:bg-app-elevated"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center">
                <span className="text-text-inverse font-bold text-sm">A</span>
              </div>
              <div>
                <p className="text-text-primary font-space text-sm">Admin</p>
                <p className="text-text-secondary font-inter text-xs">—</p>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start space-x-3 h-10 text-danger hover:bg-danger/10 transition-all duration-300 font-inter"
              onClick={async () => {
                try {
                  await fetch("/api/admin/logout", { method: "POST" })
                } catch {}
                window.location.href = "/admin/login"
              }}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
