// Notification Event Emitter - Single entry point for all notifications

import { createClient } from "@supabase/supabase-js"
import type { NotificationPayload, NotificationUser, NotificationUserSetting, ChannelType } from "./types"
import { renderTemplate } from "./render"
import { dispatchPendingNotifications } from "./dispatcher"
import { logInfo, logError } from "@/lib/logger"

/**
 * Emits a notification event.
 * This is the ONLY way to create notifications in the system.
 * 
 * Flow:
 * 1. Insert event into notification_events
 * 2. Find eligible users (active + enabled for this type)
 * 3. Create delivery records (status: pending)
 * 4. Trigger dispatcher asynchronously
 * 5. Return immediately (non-blocking)
 * 
 * @param payload - The notification payload
 */
export async function emitNotification(payload: NotificationPayload): Promise<void> {
    try {
        logInfo("notifications/emitter", "emit_start", {
            type: payload.type,
            actor: payload.actor,
            summary: payload.summary,
        })

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceKey) {
            logError("notifications/emitter", new Error("Supabase credentials missing"))
            return // Fail silently, don't block main flow
        }

        const supabase = createClient(supabaseUrl, serviceKey)

        // Step 1: Insert notification event
        const { data: event, error: eventError } = await supabase
            .from("notification_events")
            .insert({
                notification_type: payload.type,
                actor_type: payload.actor.type,
                actor_identifier: payload.actor.identifier,
                summary: payload.summary,
                metadata: payload.metadata,
            })
            .select()
            .single()

        if (eventError || !event) {
            logError("notifications/emitter", eventError || new Error("Failed to create event"))
            return
        }

        logInfo("notifications/emitter", "event_created", { event_id: event.id })

        // Step 2: Fetch eligible users (active users only)
        const { data: users, error: usersError } = await supabase
            .from("notification_users")
            .select("*")
            .eq("is_active", true)

        if (usersError || !users || users.length === 0) {
            logInfo("notifications/emitter", "no_eligible_users")
            return
        }

        logInfo("notifications/emitter", "fetched_users", { count: users.length })

        // Step 3: For each user, check settings and create deliveries
        const deliveriesToCreate: any[] = []

        for (const user of users as NotificationUser[]) {
            // Fetch user settings for this notification type
            const { data: settings } = await supabase
                .from("notification_user_settings")
                .select("*")
                .eq("user_id", user.id)
                .eq("notification_type", payload.type)
                .single()

            const userSettings = settings as NotificationUserSetting | null

            // If no settings exist or disabled, skip
            if (!userSettings || !userSettings.enabled) {
                continue
            }

            // Determine which channels to use based on settings
            const channels: ChannelType[] = []
            if (userSettings.via_email && user.email) {
                channels.push("email")
            }
            if (userSettings.via_sms && user.phone) {
                channels.push("sms")
            }

            // Create delivery records for each channel
            for (const channel of channels) {
                deliveriesToCreate.push({
                    event_id: event.id,
                    user_id: user.id,
                    channel,
                    status: "pending",
                })
            }
        }

        if (deliveriesToCreate.length === 0) {
            logInfo("notifications/emitter", "no_deliveries_to_create")
            return
        }

        // Step 4: Insert deliveries
        const { error: deliveriesError } = await supabase.from("notification_deliveries").insert(deliveriesToCreate)

        if (deliveriesError) {
            logError("notifications/emitter", deliveriesError)
            return
        }

        logInfo("notifications/emitter", "deliveries_created", { count: deliveriesToCreate.length })

        // Step 5: Trigger dispatcher asynchronously (non-blocking)
        setTimeout(() => {
            dispatchPendingNotifications().catch((err) => {
                logError("notifications/emitter", err, { context: "async_dispatch" })
            })
        }, 100)

        logInfo("notifications/emitter", "emit_complete", { event_id: event.id })
    } catch (error: any) {
        // Log error but don't throw - notifications should never block main flow
        logError("notifications/emitter", error)
    }
}
