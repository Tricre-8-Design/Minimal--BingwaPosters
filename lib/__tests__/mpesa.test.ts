import { describe, it, expect } from "vitest"
import { normalizePhone } from "../mpesa"

// Unit tests for phone normalization logic (Kenyan numbers)
// Ensures local and international formats normalize to 254XXXXXXXXX

describe("normalizePhone", () => {
  it("converts local 07XXXXXXXX to 2547XXXXXXXX", () => {
    expect(normalizePhone("0712345678")).toBe("254712345678")
  })

  it("converts local 01XXXXXXXX to 2541XXXXXXXX", () => {
    expect(normalizePhone("0112345678")).toBe("254112345678")
  })

  it("converts local 7XXXXXXXX to 2547XXXXXXXX", () => {
    expect(normalizePhone("712345678")).toBe("254712345678")
  })

  it("converts 2540XXXXXXXX to 254XXXXXXXX (strip 0)", () => {
    expect(normalizePhone("2540712345678")).toBe("254712345678")
  })

  it("keeps 2547XXXXXXXX as-is", () => {
    expect(normalizePhone("254712345678")).toBe("254712345678")
  })
})