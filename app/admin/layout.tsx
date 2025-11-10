"use client"

import type React from "react"

import { useState } from "react"
import { usePathname } from "next/navigation"
import AdminHeader from "@/components/admin-header"
import IdleLogout from "@/components/admin/idle-logout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [notificationCount, setNotificationCount] = useState(3)
  const pathname = usePathname()

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  if (pathname === "/admin/login") {
    // Login page uses same layout chrome-less
    return children
  }

  return (
    <div className={`min-h-screen site-gradient-bg ${isDarkMode ? "dark" : ""} relative overflow-hidden`}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>
      </div>

      <AdminHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} notificationCount={notificationCount} />
      <IdleLogout />

      <div className="w-full">
        <main className="relative z-10 p-4 sm:p-6 lg:p-8 section-fade-in scroll-fade-in transition-smooth">{children}</main>
      </div>
    </div>
  )
}
