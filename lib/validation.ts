// Validation helpers for user-submitted and payment-related data

// Validates Mpesa receipt codes (typically 10 uppercase alphanumeric characters)
// Accepts 10-12 uppercase alphanumeric to be tolerant of variants
export const isValidMpesaReceipt = (code?: string | null): boolean => {
  if (!code || typeof code !== "string") return false
  const trimmed = code.trim()
  // Reject known non-receipt prefixes like ws_CO_ (CheckoutRequestID)
  if (trimmed.toLowerCase().startsWith("ws_co_")) return false
  // Validate uppercase alphanumeric receipt format (length 10–12)
  return /^[A-Z0-9]{10,12}$/.test(trimmed)
}

// Simple non-empty validator for comments with max length
export const isValidComment = (text?: string | null, maxLen = 500): boolean => {
  if (text == null) return true
  const val = String(text)
  return val.length <= maxLen
}

// Validates rating is within 1-5
export const isValidRating = (rating: number): boolean => {
  return Number.isFinite(rating) && rating >= 1 && rating <= 5
}

// Validates Kenya local phone format: 10 digits starting with 07 or 01
// Input is a user-entered local number (e.g., "07XX XXX XXX"), not E.164
export const isValidKenyaLocalPhone = (text?: string | null): boolean => {
  if (!text) return false
  const digits = String(text).replace(/\D/g, "")
  return digits.length === 10 && (digits.startsWith("07") || digits.startsWith("01"))
}