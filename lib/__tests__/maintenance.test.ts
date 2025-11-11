import { describe, it, expect } from "vitest"
import { isTrue, parseAllowedIps, shouldBypassMaintenance, evaluateMaintenanceMode } from "../../lib/maintenance"

describe("maintenance utils", () => {
  it("isTrue parses boolean strings", () => {
    expect(isTrue("true")).toBe(true)
    expect(isTrue("TRUE")).toBe(true)
    expect(isTrue("false")).toBe(false)
    expect(isTrue(undefined)).toBe(false)
  })

  it("evaluateMaintenanceMode handles exact, case-variants, and invalid values", () => {
    const eTrue = evaluateMaintenanceMode("true")
    expect(eTrue.enabled).toBe(true)
    expect(eTrue.reason).toBe("true")

    const eFalse = evaluateMaintenanceMode("false")
    expect(eFalse.enabled).toBe(false)
    expect(eFalse.reason).toBe("false")

    const eUpperTrue = evaluateMaintenanceMode("TRUE")
    expect(eUpperTrue.enabled).toBe(true)
    expect(eUpperTrue.reason).toBe("normalized")
    expect(eUpperTrue.warnings.length).toBeGreaterThan(0)

    const eMixedFalse = evaluateMaintenanceMode("False")
    expect(eMixedFalse.enabled).toBe(false)
    expect(eMixedFalse.reason).toBe("normalized")
    expect(eMixedFalse.warnings.length).toBeGreaterThan(0)

    const eInvalid = evaluateMaintenanceMode("yes")
    expect(eInvalid.enabled).toBe(false)
    expect(eInvalid.reason).toBe("invalid")
    expect(eInvalid.warnings.length).toBeGreaterThan(0)

    const eEmpty = evaluateMaintenanceMode("")
    expect(eEmpty.enabled).toBe(false)
    expect(eEmpty.reason).toBe("invalid")

    const eMissing = evaluateMaintenanceMode(undefined)
    expect(eMissing.enabled).toBe(false)
    expect(eMissing.reason).toBe("missing")
    expect(eMissing.warnings.length).toBeGreaterThan(0)
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