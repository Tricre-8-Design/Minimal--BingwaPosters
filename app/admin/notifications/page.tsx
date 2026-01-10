"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import NotificationsTable from "@/components/admin/notifications/NotificationsTable"

export default function NotificationsPage() {
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        // Check admin authentication
        const checkAuth = async () => {
            const response = await fetch("/api/admin/verify")
            if (!response.ok) {
                router.push("/admin/login")
            } else {
                setIsAuthenticated(true)
            }
        }
        checkAuth()
    }, [router])

    if (!isAuthenticated) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-white">Checking authentication...</div>
            </div>
        )
    }

    return (
        <div className="container mx-auto">
            <NotificationsTable />
        </div>
    )
}
