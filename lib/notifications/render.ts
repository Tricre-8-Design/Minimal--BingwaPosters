// Template Renderer - Resolves template placeholders with metadata

import { createClient } from "@supabase/supabase-js"
import type { NotificationTemplate, ChannelType } from "./types"
import { logError } from "@/lib/logger"

/**
 * Renders a notification template by replacing placeholders with metadata values
 * @param notificationType - The type of notification
 * @param channel - The channel (email or sms)
 * @param metadata - The data to inject into the template
 * @returns Rendered subject and body
 */
export async function renderTemplate(
    notificationType: string,
    channel: ChannelType,
    metadata: Record<string, any>,
): Promise<{ subject: string | null; body: string }> {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, serviceKey)

        // Fetch template for this notification type and channel
        const { data: template, error } = await supabase
            .from("notification_templates")
            .select("*")
            .eq("notification_type", notificationType)
            .eq("channel", channel)
            .single()

        if (error || !template) {
            logError("notifications/render", new Error(`Template not found: ${notificationType}/${channel}`), { error })
            // Return fallback
            return {
                subject: channel === "email" ? `Notification: ${notificationType}` : null,
                body: `Event: ${notificationType}\n${JSON.stringify(metadata, null, 2)}`,
            }
        }

        const tmpl = template as NotificationTemplate

        // Replace placeholders like {{variable}}
        const replacePlaceholders = (text: string): string => {
            return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return metadata[key] !== undefined ? String(metadata[key]) : match
            })
        }

        return {
            subject: tmpl.subject ? replacePlaceholders(tmpl.subject) : null,
            body: replacePlaceholders(tmpl.body),
        }
    } catch (error: any) {
        logError("notifications/render", error)
        return {
            subject: channel === "email" ? `Notification: ${notificationType}` : null,
            body: `Event: ${notificationType}`,
        }
    }
}
