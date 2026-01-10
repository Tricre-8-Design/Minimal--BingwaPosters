import { supabaseAdmin } from "@/lib/supabase"

/**
 * Check if a specific engine is under maintenance
 * @param engine - 'placid' or 'ai'
 * @returns { isUnderMaintenance: boolean, message: string }
 */
export async function checkMaintenanceStatus(
    engine: "placid" | "ai"
): Promise<{ isUnderMaintenance: boolean; message: string }> {
    try {
        const settingKey = `maintenance_${engine}`

        const { data, error } = await supabaseAdmin
            .from("system_settings")
            .select("setting_value")
            .eq("setting_key", settingKey)
            .single()

        if (error || !data) {
            // If no setting found, assume not under maintenance
            console.log(`[${engine}] No setting found or error:`, error)
            return {
                isUnderMaintenance: false,
                message: "",
            }
        }

        const settingValue = data.setting_value as { enabled: boolean; message: string }

        console.log(`[${engine}] Raw data from DB:`, data)
        console.log(`[${engine}] Parsed setting_value:`, settingValue)
        console.log(`[${engine}] isUnderMaintenance will be:`, settingValue.enabled)

        return {
            isUnderMaintenance: settingValue.enabled || false,
            message: settingValue.message || `${engine.toUpperCase()} poster generation is currently unavailable.`,
        }
    } catch (error) {
        console.error(`Error checking maintenance status for ${engine}:`, error)
        // In case of error, allow generation to proceed
        return {
            isUnderMaintenance: false,
            message: "",
        }
    }
}

/**
 * Get maintenance status for all engines
 * @returns Object with maintenance status for each engine
 */
export async function getAllMaintenanceStatus(): Promise<{
    placid: { isUnderMaintenance: boolean; message: string }
    ai: { isUnderMaintenance: boolean; message: string }
}> {
    const [placidStatus, aiStatus] = await Promise.all([
        checkMaintenanceStatus("placid"),
        checkMaintenanceStatus("ai"),
    ])

    return {
        placid: placidStatus,
        ai: aiStatus,
    }
}
