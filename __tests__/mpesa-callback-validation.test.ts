
import { describe, it, expect, vi } from "vitest"

// Mock internal modules first
vi.mock("@/lib/validation", () => ({
  isValidMpesaReceipt: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  safeRedact: vi.fn(),
}))

vi.mock("@/lib/mpesa", () => ({
  normalizePhone: vi.fn((p) => p),
}))

vi.mock("@/lib/server-errors", () => ({
  safeErrorResponse: vi.fn(),
}))

vi.mock("@/lib/notifications/emitter", () => ({
  emitNotification: vi.fn().mockResolvedValue(true),
}))

// Mock Next.js and Supabase
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({ body, init })),
  },
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {} })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: {} })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}))

// Mock process.env
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.com"
process.env.SUPABASE_SERVICE_ROLE_KEY = "secret"

// Import AFTER mocks
import { POST } from "../app/api/mpesa/callback/route"
import { isValidMpesaReceipt } from "@/lib/validation"
import { logError } from "@/lib/logger"

describe("M-Pesa Callback Receipt Validation", () => {
  it("should log error if receipt format is invalid but proceed", async () => {
    // Setup
    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        Body: {
          stkCallback: {
            ResultCode: 0,
            ResultDesc: "Success",
            CheckoutRequestID: "checkout123",
            CallbackMetadata: {
              Item: [
                { Name: "MpesaReceiptNumber", Value: "INVALID_RECEIPT" },
                { Name: "Amount", Value: 100 },
                { Name: "PhoneNumber", Value: 254700000000 },
              ],
            },
          },
        },
      }),
    } as unknown as Request

    // Mock validation to fail
    vi.mocked(isValidMpesaReceipt).mockReturnValue(false)

    // Execute
    await POST(mockRequest)

    // Verify
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api/mpesa/callback",
        error: expect.any(Error),
        meta: expect.objectContaining({ receipt: "INVALID_RECEIPT" }),
      })
    )
  })

  it("should NOT log error if receipt format is valid", async () => {
    // Setup
    // Reset mocks to ensure previous calls don't interfere
    vi.mocked(logError).mockClear()

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        Body: {
          stkCallback: {
            ResultCode: 0,
            CallbackMetadata: {
              Item: [
                { Name: "MpesaReceiptNumber", Value: "QWE123456" },
              ],
            },
          },
        },
      }),
    } as unknown as Request

    // Mock validation to pass
    vi.mocked(isValidMpesaReceipt).mockReturnValue(true)

    // Execute
    await POST(mockRequest)

    // Verify
    expect(logError).not.toHaveBeenCalledWith(
      expect.objectContaining({
        source: "api/mpesa/callback",
        error: expect.objectContaining({ message: "Invalid M-Pesa receipt format" }),
      })
    )
  })
})
