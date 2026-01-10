import { NextRequest, NextResponse } from "next/server"
import { getAllMaintenanceStatus } from "@/lib/engine-maintenance"

// Force dynamic rendering - no caching!
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/maintenance-status
// Public endpoint to check maintenance status for all engines
export async function GET(req: NextRequest) {
    try {
        const maintenanceStatus = await getAllMaintenanceStatus()

        return NextResponse.json(
            {
                success: true,
                maintenance: maintenanceStatus,
            },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            }
        )
    } catch (error: any) {
        console.error("Error fetching maintenance status:", error)
        // On error, return no maintenance to avoid blocking users
        return NextResponse.json({
            success: true,
            maintenance: {
                placid: { isUnderMaintenance: false, message: "" },
                ai: { isUnderMaintenance: false, message: "" },
            },
        })
    }
}
