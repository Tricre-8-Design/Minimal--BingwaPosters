// Email Channel Handler - Sends notifications via Make webhook

import type { MakeWebhookPayload } from "../types"
import { logInfo, logError } from "@/lib/logger"

export async function sendEmail(payload: MakeWebhookPayload): Promise<{ success: boolean; error?: string }> {
    try {
        const webhookUrl = process.env.MAKE_NOTIFICATION_WEBHOOK_URL

        if (!webhookUrl) {
            logError("notifications/email", new Error("MAKE_NOTIFICATION_WEBHOOK_URL not configured"))
            return { success: false, error: "MAKE_NOTIFICATION_WEBHOOK_URL not configured" }
        }

        logInfo("notifications/email", "sending_webhook", { event_id: payload.event_id, recipient: payload.recipient.email })

        // Prepare the exact payload string
        const payloadString = JSON.stringify(payload, null, 2)

        // Log the EXACT payload for debugging Make.com issues
        logInfo("notifications/email", "webhook_payload_debug", {
            full_payload: payloadString,
            recipient_email: payload.recipient?.email,
            recipient_name: payload.recipient?.name,
            subject: payload.subject,
            body_preview: payload.body?.substring(0, 100),
            metadata: payload.metadata
        })

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: payloadString,
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error")
            logError("notifications/email", new Error(`Make webhook failed: ${response.status}`), { errorText })
            return { success: false, error: `Make webhook failed: ${response.status}` }
        }

        logInfo("notifications/email", "webhook_success", { event_id: payload.event_id })
        return { success: true }
    } catch (error: any) {
        logError("notifications/email", error)
        return { success: false, error: error.message }
    }
}
