import { useState, useEffect } from "react"

interface MaintenanceStatus {
    isUnderMaintenance: boolean
    message: string
}

interface AllMaintenanceStatus {
    placid: MaintenanceStatus
    ai: MaintenanceStatus
}

export function useMaintenanceStatus() {
    const [status, setStatus] = useState<AllMaintenanceStatus>({
        placid: { isUnderMaintenance: false, message: "" },
        ai: { isUnderMaintenance: false, message: "" },
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function checkMaintenance() {
            try {
                const response = await fetch("/api/maintenance-status")
                const data = await response.json()

                if (data.success && data.maintenance) {
                    setStatus(data.maintenance)
                }
            } catch (error) {
                console.error("Error checking maintenance status:", error)
                // On error, assume no maintenance
            } finally {
                setLoading(false)
            }
        }

        checkMaintenance()

        // Re-check every 30 seconds
        const interval = setInterval(checkMaintenance, 30000)

        return () => clearInterval(interval)
    }, [])

    return { status, loading }
}
