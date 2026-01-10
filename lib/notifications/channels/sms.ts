// SMS Channel Handler - Sends notifications via Blaze Tech SMS API

import { logInfo, logError } from "@/lib/logger"

export interface SMSPayload {
    phone: string
    message: string
    event_id: string
}

export async function sendSMS(payload: SMSPayload): Promise<{ success: boolean; error?: string; response?: any }> {
    try {
        const blazeApiKey = process.env.BLAZE_API_KEY
        const blazeSenderId = process.env.BLAZE_SENDER_ID || "SKYSCOPE_"

        if (!blazeApiKey) {
            logError("notifications/sms", new Error("BLAZE_API_KEY not configured"))
            return { success: false, error: "BLAZE_API_KEY not configured" }
        }

        // Debug logging to verify all fields
        logInfo("notifications/sms", "sending_sms", {
            event_id: payload.event_id,
            phone: payload.phone,
            has_api_key: !!blazeApiKey,
            api_key_length: blazeApiKey?.length,
            sender_id: blazeSenderId,
            message_length: payload.message?.length
        })

        // Sanitize message - remove problematic characters and ensure plain text
        const sanitizedMessage = payload.message
            .replace(/\r\n/g, " ")  // Replace CRLF with space
            .replace(/\n/g, " ")     // Replace LF with space
            .replace(/\r/g, " ")     // Replace CR with space
            .replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
            .trim()

        // Prepare the request payload exactly as per documentation
        const requestPayload = {
            api_key: blazeApiKey,
            message: sanitizedMessage,
            phone: payload.phone,
            sender_id: blazeSenderId,
        }

        // Log the exact payload being sent (without exposing full API key)
        logInfo("notifications/sms", "request_payload", {
            api_key: `${blazeApiKey.substring(0, 10)}...`,
            message: sanitizedMessage.substring(0, 50),
            phone: payload.phone,
            sender_id: blazeSenderId,
        })

        // Blaze Tech SMS API - Official documentation format
        // Using single SMS endpoint since we send to one recipient at a time
        const response = await fetch("https://sms.blazetechscope.com/v1/sendsms", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestPayload),
        })

        const responseData = await response.json().catch(() => ({}))

        // Log the full response for debugging
        logInfo("notifications/sms", "api_response", {
            status: response.status,
            ok: response.ok,
            response: responseData
        })

        // Check HTTP status
        if (!response.ok) {
            logError("notifications/sms", new Error(`Blaze API failed: ${response.status}`), { responseData })
            return { success: false, error: `Blaze API failed: ${response.status}`, response: responseData }
        }

        // Check for errors in response body - Blaze API returns multiple error formats
        if (responseData.error) {
            logError("notifications/sms", new Error(`Blaze API error: ${responseData.error}`), { responseData })
            return { success: false, error: responseData.error, response: responseData }
        }

        // Check for status: "error" with reason field
        if (responseData.status === "error" || responseData.statusCode) {
            const errorMessage = responseData.reason || responseData.error || `Error ${responseData.statusCode}`
            logError("notifications/sms", new Error(`Blaze API error: ${errorMessage}`), { responseData })
            return { success: false, error: errorMessage, response: responseData }
        }

        // Check for explicit success field (some APIs return this)
        if (responseData.success === true) {
            logInfo("notifications/sms", "sms_success", {
                event_id: payload.event_id,
                response: responseData
            })
            return { success: true, response: responseData }
        }

        // Check for success (response-code: 200)
        if (responseData["response-code"] === 200) {
            logInfo("notifications/sms", "sms_success", {
                event_id: payload.event_id,
                message_id: responseData.messageid,
                mobile: responseData.mobile
            })
            return { success: true, response: responseData }
        }

        // Unknown response format
        const errorMsg = responseData["response-description"] || "Unknown error from Blaze API"
        logError("notifications/sms", new Error(`Blaze API unexpected response: ${errorMsg}`), { responseData })
        return { success: false, error: errorMsg, response: responseData }

    } catch (error: any) {
        logError("notifications/sms", error)
        return { success: false, error: error.message }
    }
}
