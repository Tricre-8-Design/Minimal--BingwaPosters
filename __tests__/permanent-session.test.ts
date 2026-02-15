
import { describe, it, expect, vi } from "vitest"
import { fetchPermanentSessionData, isPermanentSession, PERMANENT_TEST_SESSION_ID } from "../lib/permanent-session"

describe("Permanent Session Logic", () => {
  it("should identify the permanent test session ID", () => {
    expect(isPermanentSession(PERMANENT_TEST_SESSION_ID)).toBe(true)
    expect(isPermanentSession("random_session_id")).toBe(false)
  })

  it("should fetch session data for permanent ID", async () => {
    const mockPoster = {
      template_id: "Temp001",
      image_url: "https://example.com/poster.jpg",
    }
    const mockTemplate = {
      price: 100,
    }

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPoster, error: null }),
          }),
        }),
      }),
    } as any

    // Mock the template fetch as well
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "generated_posters") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockPoster, error: null }),
            }),
          }),
        }
      }
      if (table === "poster_templates") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockTemplate, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    const result = await fetchPermanentSessionData(mockSupabase, PERMANENT_TEST_SESSION_ID)

    expect(result).toEqual({
      templateId: "Temp001",
      posterUrl: "https://example.com/poster.jpg",
      price: 100,
      paymentStatus: "pending",
      paymentTime: null,
      mpesaNumber: "",
      mpesaCode: "",
    })
  })

  it("should return null for non-permanent session ID", async () => {
    const mockSupabase = {} as any
    const result = await fetchPermanentSessionData(mockSupabase, "some_other_id")
    expect(result).toBeNull()
  })
})
