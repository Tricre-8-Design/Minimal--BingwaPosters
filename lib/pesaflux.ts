
// Normalize phone numbers to 254XXXXXXXXX (no plus) for Safaricom/Telkom/Airtel
// Accepts formats: 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, 1XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX, 2540XXXXXXXX
// Ensures we NEVER keep the leading 0 after country code (i.e., 2540XXXXXXXX -> 254XXXXXXXX)
export function normalizePhone(phone: string): string {
    const raw = String(phone || "")
    const digits = raw.replace(/\D/g, "")

    // Handle country code with accidental leading 0: 2540XXXXXXXX -> 254XXXXXXXX
    if (digits.startsWith("2540")) {
        return `254${digits.slice(4)}`
    }

    // Already in proper country format
    if (digits.startsWith("254")) {
        return digits
    }

    // Local format starting with 0 (07XXXXXXXX or 01XXXXXXXX)
    if (digits.startsWith("0")) {
        const rest = digits.slice(1)
        return `254${rest}`
    }

    // Local format without 0 (7XXXXXXXX or 1XXXXXXXX)
    if (digits.startsWith("7") || digits.startsWith("1")) {
        return `254${digits}`
    }

    // Fallback: return digits as-is
    return digits
}

export interface PesaFluxStkPushParams {
    amount: number
    phoneNumber: string
    reference?: string // Used as TransactionReference or AccountReference
    email?: string
}

export interface PesaFluxStkPushResponse {
    success: string // "200"
    massage: string // "Request sent sucessfully."
    transaction_request_id: string // "SOFTPID..."
}

export interface PesaFluxWebhookPayload {
    ResponseCode: number
    ResponseDescription: string
    MerchantRequestID: string
    CheckoutRequestID: string // Important: PesaFlux seems to return this, might map to internal IDs
    TransactionID: string // The ID returned as transaction_request_id in initiate response?? Or new?
    // Docs say: initiate returns transaction_request_id (e.g. SOFTPID...)
    // Webhook returns TransactionID (e.g. SOFTPID...) matching that request ID?
    // Let's assume TransactionID in webhook corresponds to transaction_request_id from initiate.
    TransactionAmount: number
    TransactionReceipt: string // MPESA Receipt
    TransactionDate: string
    TransactionReference: string
    Msisdn: string
}

export async function initiatePesaFluxStkPush({
    amount,
    phoneNumber,
    reference = "BingwaPoster",
    email,
}: PesaFluxStkPushParams): Promise<PesaFluxStkPushResponse> {
    const apiKey = process.env.PESAFLUX_API_KEY
    const defaultEmail = process.env.PESAFLUX_EMAIL

    if (!apiKey) {
        throw new Error("Missing PESAFLUX_API_KEY environment variable")
    }

    // Use provided email or fall back to env var, or a dummy if strictly required but not provided
    const finalEmail = email || defaultEmail || "noreply@bingwaposters.com"

    const url = "https://api.pesaflux.co.ke/v1/initiatestk"
    const msisdn = normalizePhone(phoneNumber)

    const payload = {
        api_key: apiKey,
        email: finalEmail,
        amount: String(amount), // API expects string according to docs examples? "30"
        msisdn,
        reference,
    }

    try {
        console.log(`[PesaFlux] Initiating STK Push for ${msisdn} amount=${amount}`)
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })

        const bodyText = await res.text()
        let responseData: any
        try {
            responseData = JSON.parse(bodyText)
        } catch (e) {
            throw new Error(`Invalid JSON response from PesaFlux: ${bodyText}`)
        }

        if (!res.ok) {
            throw new Error(`PesaFlux API Error: ${res.status} ${JSON.stringify(responseData)}`)
        }

        // PesaFlux success check
        // Doc example: { "success": "200", ... }
        if (responseData.success !== "200" && responseData.success !== 200) {
            throw new Error(`PesaFlux returned non-success: ${JSON.stringify(responseData)}`)
        }

        return responseData as PesaFluxStkPushResponse
    } catch (error) {
        console.error("[PesaFlux] Error initiating STK push:", error)
        throw error
    }
}
