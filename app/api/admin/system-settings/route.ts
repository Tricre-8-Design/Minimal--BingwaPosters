import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/admin/system-settings
// Fetch all system settings (for admin dashboard)
export async function GET(req: NextRequest) {
    try {
        // Fetch all system settings
        const { data: settings, error } = await supabaseAdmin
            .from("system_settings")
            .select("*")
            .order("setting_key", { ascending: true })

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            settings: settings || [],
        })
    } catch (error: any) {
        console.error("Error fetching system settings:", error)
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch settings" },
            { status: 500 }
        )
    }
}

// POST /api/admin/system-settings
// Update a system setting (for toggling maintenance modes)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { setting_key, setting_value, updated_by } = body

        if (!setting_key || !setting_value) {
            return NextResponse.json(
                { success: false, error: "setting_key and setting_value are required" },
                { status: 400 }
            )
        }

        // Update the setting
        const { data, error } = await supabaseAdmin
            .from("system_settings")
            .update({
                setting_value,
                updated_by: updated_by || "admin",
                updated_at: new Date().toISOString(),
            })
            .eq("setting_key", setting_key)
            .select()
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            setting: data,
            message: "Setting updated successfully",
        })
    } catch (error: any) {
        console.error("Error updating system setting:", error)
        return NextResponse.json(
            { success: false, error: error.message || "Failed to update setting" },
            { status: 500 }
        )
    }
}
