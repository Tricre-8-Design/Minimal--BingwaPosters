// Notification Dispatcher - Processes pending deliveries

import { createClient } from "@supabase/supabase-js"
import type { NotificationDelivery, MakeWebhookPayload } from "./types"
import { sendEmail } from "./channels/email"
import { sendSMS } from "./channels/sms"
import { logInfo, logError } from "@/lib/logger"

const MAX_RETRIES = 0 // No retries - send once only


/**
 * Dispatches a single notification delivery
 * @param delivery - The delivery record
 * @param retryCount - Current retry attempt
 */
async function dispatchOne(delivery: NotificationDelivery, retryCount: number = 0): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    try {
        logInfo("notifications/dispatcher", "dispatching", { delivery_id: delivery.id, channel: delivery.channel, retry: retryCount })

        // Fetch user details and event details for context
        const { data: user } = await supabase
            .from("notification_users")
            .select("name, email, phone")
            .eq("id", delivery.user_id)
            .single()

        const { data: event } = await supabase
            .from("notification_events")
            .select("notification_type, metadata")
            .eq("id", delivery.event_id)
            .single()

        if (!user) {
            throw new Error("User not found")
        }

        let result: { success: boolean; error?: string; response?: any }

        if (delivery.channel === "email") {
            if (!user.email) {
                throw new Error("User has no email address")
            }

            // Import the render function
            const { renderTemplate } = await import("./render")

            // Render the template with metadata to replace all {{variables}}
            const { subject, body } = await renderTemplate(
                event?.notification_type || "",
                "email",
                event?.metadata || {}
            )

            // Debug logging for rendered template
            logInfo("notifications/dispatcher", "email_template_rendered", {
                notification_type: event?.notification_type,
                rendered_subject: subject,
                rendered_body_length: body.length,
                rendered_body_preview: body.substring(0, 100),
                metadata: event?.metadata,
            })

            const emailPayload: MakeWebhookPayload = {
                event_id: delivery.event_id,
                notification_type: event?.notification_type || "",
                recipient: {
                    name: user.name,
                    email: user.email,
                },
                subject: subject,
                body: body,
                metadata: event?.metadata || {},
            }

            result = await sendEmail(emailPayload)
        } else if (delivery.channel === "sms") {
            if (!user.phone) {
                throw new Error("User has no phone number")
            }

            // Import the render function
            const { renderTemplate } = await import("./render")

            // Render the template with metadata
            const { body } = await renderTemplate(
                event?.notification_type || "",
                "sms",
                event?.metadata || {}
            )

            // Debug logging for template
            logInfo("notifications/dispatcher", "sms_template_rendered", {
                notification_type: event?.notification_type,
                rendered_message_length: body.length,
                rendered_message_preview: body.substring(0, 50),
                metadata: event?.metadata,
            })

            result = await sendSMS({
                phone: user.phone,
                message: body,
                event_id: delivery.event_id,
            })
        } else {
            throw new Error(`Unknown channel: ${delivery.channel}`)
        }

        // Update delivery status
        if (result.success) {
            await supabase
                .from("notification_deliveries")
                .update({
                    status: "sent",
                    sent_at: new Date().toISOString(),
                    provider_response: typeof result.response === "string" ? result.response : JSON.stringify(result.response || {}),
                })
                .eq("id", delivery.id)

            logInfo("notifications/dispatcher", "delivery_sent", { delivery_id: delivery.id })
        } else {
            // No retry - mark as failed immediately
            await supabase
                .from("notification_deliveries")
                .update({
                    status: "failed",
                    provider_response: result.error || "Unknown error",
                })
                .eq("id", delivery.id)

            logError("notifications/dispatcher", new Error(`Delivery failed: ${result.error}`), {
                delivery_id: delivery.id,
            })
        }
    } catch (error: any) {
        logError("notifications/dispatcher", error, { delivery_id: delivery.id })

        // Mark as failed
        const supabase2 = createClient(supabaseUrl, serviceKey)
        await supabase2
            .from("notification_deliveries")
            .update({
                status: "failed",
                provider_response: error.message,
            })
            .eq("id", delivery.id)
    }
}

/**
 * Processes all pending notification deliveries
 */
export async function dispatchPendingNotifications(): Promise<void> {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, serviceKey)

        logInfo("notifications/dispatcher", "fetch_pending")

        // Fetch all pending deliveries
        const { data: deliveries, error } = await supabase
            .from("notification_deliveries")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(50) // Process in batches

        if (error) {
            throw error
        }

        if (!deliveries || deliveries.length === 0) {
            logInfo("notifications/dispatcher", "no_pending_deliveries")
            return
        }

        logInfo("notifications/dispatcher", "processing_deliveries", { count: deliveries.length })

        // Process each delivery
        for (const delivery of deliveries as NotificationDelivery[]) {
            await dispatchOne(delivery, 0)
        }

        logInfo("notifications/dispatcher", "batch_complete", { count: deliveries.length })
    } catch (error: any) {
        logError("notifications/dispatcher", error)
    }
}
