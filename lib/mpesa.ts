// M-Pesa Daraja utilities and auth service
// Provides access token caching, payload builders, and STK Push initiation
// Inputs: consumer key/secret, shortcode, passkey, callback URL via env
// Outputs: access token, normalized phone number, timestamp, password

// Environment handling
// Reads MPESA_ENV (preferred) or falls back to legacy MPESA_ENVIRONMENT
type MpesaEnvironment = "sandbox" | "production"

function resolveEnv(): MpesaEnvironment {
  const raw = (process.env.MPESA_ENV || process.env.MPESA_ENVIRONMENT || "sandbox").toLowerCase()
  return raw === "production" ? "production" : "sandbox"
}

const MPESA_ENV: MpesaEnvironment = resolveEnv()

type MpesaTransactionType = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline"

function resolveTransactionType(): MpesaTransactionType {
  const raw = String(process.env.MPESA_TRANSACTION_TYPE || "").trim().toLowerCase()
  if (raw === "customerbuygoodsonline") return "CustomerBuyGoodsOnline"
  // Default to PayBill
  return "CustomerPayBillOnline"
}

function sanitizeAccountReference(ref: string): string {
  // Allow alphanumeric and spaces; max 20 chars per Daraja guidance
  const cleaned = String(ref || "")
    .replace(/[^A-Za-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const truncated = cleaned.slice(0, 20)
  return truncated || `POSTER${Date.now().toString().slice(-6)}`
}

function sanitizeTransactionDesc(desc: string): string {
  // Allow alphanumeric and spaces; keep short (<=20)
  const cleaned = String(desc || "").replace(/[^A-Za-z0-9\s]/g, "").trim()
  const truncated = cleaned.slice(0, 20)
  return truncated || "Poster payment"
}

// In-memory token cache (per server instance)
let cachedToken: { token: string; expiresAt: number } | null = null

function getBaseUrl(env: MpesaEnvironment = MPESA_ENV) {
  // Allow explicit override via MPESA_BASE_URL, else derive from env
  const override = process.env.MPESA_BASE_URL
  if (override && /^https?:\/\//i.test(override)) return override.replace(/\/$/, "")
  return env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"
}

function getOauthUrl(env: MpesaEnvironment = MPESA_ENV) {
  return `${getBaseUrl(env)}/oauth/v1/generate?grant_type=client_credentials`
}

function getStkPushUrl(env: MpesaEnvironment = MPESA_ENV) {
  return `${getBaseUrl(env)}/mpesa/stkpush/v1/processrequest`
}

export async function getMpesaAccessToken(): Promise<{ token: string; envUsed: MpesaEnvironment }> {
  const key = process.env.MPESA_CONSUMER_KEY
  const secret = process.env.MPESA_CONSUMER_SECRET

  if (!key || !secret) {
    throw new Error("Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET")
  }

  // Return cached token if valid for at least 60 seconds
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt - now > 60_000) {
    return { token: cachedToken.token, envUsed: MPESA_ENV }
  }

  const basic = Buffer.from(`${key}:${secret}`).toString("base64")
  let envTried: MpesaEnvironment = MPESA_ENV
  const oauthUrl = getOauthUrl(envTried)
  
  // Debug log for env vars (masked)
  try {
    console.log(`[${new Date().toISOString()}] [mpesa/oauth] request_start env=${envTried} url=${oauthUrl}`)
    console.log(`[${new Date().toISOString()}] [mpesa/oauth] debug_creds key_len=${key.length} secret_len=${secret.length} basic_len=${basic.length}`)
  } catch {}

  let res = await fetch(oauthUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
    },
  })

  // Fallback to sandbox if production fails (common misconfig)
  if (!res.ok && envTried === "production") {
    const body = await res.text()
    try { 
      console.error(`[${new Date().toISOString()}] [mpesa/oauth] production_failed status=${res.status} statusText=${res.statusText} body=${body}`) 
    } catch {}
    envTried = "sandbox"
    const fallbackUrl = getOauthUrl(envTried)
    try { console.log(`[${new Date().toISOString()}] [mpesa/oauth] fallback_start env=${envTried} url=${fallbackUrl}`) } catch {}
    res = await fetch(fallbackUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
    })
  }

  if (!res.ok) {
    const body = await res.text()
    try { 
      console.error(`[${new Date().toISOString()}] [mpesa/oauth] failed status=${res.status} statusText=${res.statusText} body=${body}`) 
    } catch {}
    throw new Error(`M-Pesa OAuth failed: ${res.status} ${res.statusText} ${body}`)
  }

  // Ensure JSON is present and contains access_token
  const json = (await res.json()) as { access_token?: string; expires_in?: string }
  const token = json?.access_token
  if (!token) {
    try { console.error(`[${new Date().toISOString()}] [mpesa/oauth] success_missing_token env=${envTried} json_keys=${Object.keys(json||{}).join(',')}`) } catch {}
    throw new Error(`M-Pesa OAuth succeeded but access_token is missing from response on ${envTried}`)
  }
  const expiresInSec = parseInt(json.expires_in || "3599", 10)
  cachedToken = { token, expiresAt: now + expiresInSec * 1000 }
  try { console.log(`[${new Date().toISOString()}] [mpesa/oauth] success env=${envTried} ttl_sec=${expiresInSec}`) } catch {}
  return { token, envUsed: envTried }
}

// Timestamp in Africa/Nairobi, formatted YYYYMMDDHHmmss
export function buildTimestamp(): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value])) as any
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`
}

export function buildPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64")
}

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

export async function initiateStkPush({
  amount,
  phoneNumber,
  accountReference,
  transactionDesc,
}: {
  amount: number
  phoneNumber: string
  accountReference: string
  transactionDesc: string
}): Promise<any> {
  const { token, envUsed } = await getMpesaAccessToken()

  const shortcode = process.env.MPESA_SHORTCODE
  const passkey = process.env.MPESA_PASSKEY
  const callbackUrl = process.env.MPESA_CALLBACK_URL

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error("Missing MPESA_SHORTCODE, MPESA_PASSKEY, or MPESA_CALLBACK_URL")
  }

  const timestamp = buildTimestamp()
  const password = buildPassword(shortcode, passkey, timestamp)
  const phone = normalizePhone(phoneNumber)
  const txType = resolveTransactionType()
  const acctRef = sanitizeAccountReference(accountReference)
  const txDesc = sanitizeTransactionDesc(transactionDesc)

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: txType,
    Amount: amount,
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: acctRef,
    TransactionDesc: txDesc,
  }

  const stkUrl = getStkPushUrl(envUsed)
  try {
    console.log(
      `[${new Date().toISOString()}] [mpesa/stk] request_start env=${envUsed} url=${stkUrl} amount=${amount} phone=${phone} accountRef=${acctRef} txType=${txType}`,
    )
  } catch {}
  const res = await fetch(stkUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const body = await res.text()
  let json: any
  try {
    json = JSON.parse(body)
  } catch {
    json = { raw: body }
  }

  if (!res.ok) {
    try {
      console.error(
        `[${new Date().toISOString()}] [mpesa/stk] failed status=${res.status} statusText=${res.statusText} body=${body}`,
      )
    } catch {}
    throw new Error(`STK Push failed: ${res.status} ${JSON.stringify(json)}`)
  }
  try {
    console.log(
      `[${new Date().toISOString()}] [mpesa/stk] success status=${res.status} CheckoutRequestID=${json?.CheckoutRequestID} MerchantRequestID=${json?.MerchantRequestID}`,
    )
  } catch {}
  return json
}
