// Notification System Type Definitions
// Matching the database schema exactly

export enum NotificationType {
    ADMIN_LOGIN = "ADMIN_LOGIN",
    TEMPLATE_CREATED = "TEMPLATE_CREATED",
    TEMPLATE_UPDATED = "TEMPLATE_UPDATED",
    TEMPLATE_DELETED = "TEMPLATE_DELETED",
    TEMPLATE_STATUS_CHANGED = "TEMPLATE_STATUS_CHANGED",
    POSTER_GENERATED = "POSTER_GENERATED",
    POSTER_GENERATION_FAILED = "POSTER_GENERATION_FAILED",
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    POSTER_DOWNLOADED = "POSTER_DOWNLOADED",
    POSTER_REVIEW_SUBMITTED = "POSTER_REVIEW_SUBMITTED",
}

export type ActorType = "admin" | "user" | "system"

export type ChannelType = "email" | "sms"

export type DeliveryStatus = "pending" | "sent" | "failed"

export interface NotificationActor {
    type: ActorType
    identifier: string // email, phone, or 'system'
}

export interface NotificationPayload {
    type: NotificationType
    actor: NotificationActor
    summary: string
    metadata: Record<string, any>
}

// Database row types (matching schema exactly)

export interface NotificationUser {
    id: string
    name: string
    role: string
    email: string | null
    phone: string | null
    is_active: boolean
    created_at: string
}

export interface NotificationTypeRow {
    key: string
    description: string
    created_at: string
}

export interface NotificationUserSetting {
    id: string
    user_id: string
    notification_type: string
    via_email: boolean
    via_sms: boolean
    enabled: boolean
    created_at: string
}

export interface NotificationTemplate {
    id: string
    notification_type: string
    channel: ChannelType
    subject: string | null
    body: string
    created_at: string
    updated_at: string
}

export interface NotificationEvent {
    id: string
    notification_type: string
    actor_type: ActorType
    actor_identifier: string | null
    summary: string
    metadata: Record<string, any>
    created_at: string
}

export interface NotificationDelivery {
    id: string
    event_id: string
    user_id: string
    channel: ChannelType
    status: DeliveryStatus
    provider_response: string | null
    sent_at: string | null
    created_at: string
}

// Make webhook payload (STRICT CONTRACT)
export interface MakeWebhookPayload {
    event_id: string
    notification_type: string
    recipient: {
        name: string
        email: string
    }
    subject: string
    body: string
    metadata: Record<string, any>
}
