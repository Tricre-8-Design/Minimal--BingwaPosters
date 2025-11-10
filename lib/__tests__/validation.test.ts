import { describe, it, expect } from "vitest"
import { isValidMpesaReceipt, isValidKenyaLocalPhone } from "../validation"

describe("validation helpers", () => {
  it("validates Mpesa receipt codes", () => {
    expect(isValidMpesaReceipt("QWERTY1234")).toBe(true)
    expect(isValidMpesaReceipt("WS_CO_12345")).toBe(false)
    expect(isValidMpesaReceipt("abc123")).toBe(false)
    expect(isValidMpesaReceipt(undefined)).toBe(false)
  })

  it("validates Kenya local phone numbers (10 digits starting 07/01)", () => {
    expect(isValidKenyaLocalPhone("0712 345 678")).toBe(true)
    expect(isValidKenyaLocalPhone("0102 345 678")).toBe(true)
    expect(isValidKenyaLocalPhone("712345678")).toBe(false) // missing leading 0
    expect(isValidKenyaLocalPhone("079 123 4567")).toBe(true)
    expect(isValidKenyaLocalPhone("0212345678")).toBe(false)
    expect(isValidKenyaLocalPhone("07 1234 567")) .toBe(false) // 9 digits
  })
})