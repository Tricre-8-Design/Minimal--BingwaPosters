import { describe, it, expect } from "vitest"
import { isTrue, parseAllowedIps, shouldBypassMaintenance } from "../../lib/maintenance"

describe("maintenance utils", () => {
  it("isTrue parses boolean strings", () => {
    expect(isTrue("true")).toBe(true)
    expect(isTrue("TRUE")).toBe(true)
    expect(isTrue("false")).toBe(false)
    expect(isTrue(undefined)).toBe(false)
  })

  it("parseAllowedIps returns a set of trimmed IPs", () => {
    const set = parseAllowedIps("127.0.0.1, 10.0.0.5 ,")
    expect(set.has("127.0.0.1")).toBe(true)
    expect(set.has("10.0.0.5")).toBe(true)
    expect(set.has(" ")).toBe(false)
  })

  it("shouldBypassMaintenance allows admin and maintenance paths", () => {
    const allowed = parseAllowedIps("")
    expect(shouldBypassMaintenance("/admin", null, allowed)).toBe(true)
    expect(shouldBypassMaintenance("/maintenance", null, allowed)).toBe(true)
  })

  it("shouldBypassMaintenance allows whitelisted IPs on non-admin paths", () => {
    const allowed = parseAllowedIps("127.0.0.1")
    expect(shouldBypassMaintenance("/", "127.0.0.1", allowed)).toBe(true)
    expect(shouldBypassMaintenance("/templates", "127.0.0.1", allowed)).toBe(true)
  })

  it("shouldBypassMaintenance blocks non-whitelisted IPs on non-admin paths", () => {
    const allowed = parseAllowedIps("127.0.0.1")
    expect(shouldBypassMaintenance("/", "203.0.113.15", allowed)).toBe(false)
  })
})