"use client"

import { Bell, Moon, Sun, UsersRoundIcon, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface AdminHeaderProps {
  isDarkMode: boolean
  toggleTheme: () => void
  notificationCount: number
}

export default function AdminHeader({ isDarkMode, toggleTheme, notificationCount }: AdminHeaderProps) {
  const router = useRouter()

  const handleUserClick = () => {
    router.push("/") // Navigate to root page
  }

  return (
    <header className="relative z-20 bg-black/20 backdrop-blur-md border-b border-purple-500/20 px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          {/* (You can add theme toggle button here later if needed) */}

          {/* Notifications */}
          {/* (You can add notification icon here if needed) */}

          {/* User Icon */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-purple-500/20"
            onClick={handleUserClick}
          >
            <UsersRoundIcon className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </header>
  )
}
