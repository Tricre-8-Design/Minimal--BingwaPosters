// Maintenance utilities: shared logic used by middleware and tests
// - isTrue: normalize boolean string values
// - parseAllowedIps: parse comma-separated IPs into a Set
// - isAdminPath: check admin route
// - isMaintenancePath: check maintenance route
// - shouldBypassMaintenance: determine if request should bypass maintenance gate
// - evaluateMaintenanceMode: robust parsing with case sensitivity and warnings

export function isTrue(value: string | undefined): boolean {
  return String(value || "").toLowerCase() === "true"
}

export function parseAllowedIps(value: string | undefined): Set<string> {
  return new Set((value || "").split(",").map(s => s.trim()).filter(Boolean))
}

export function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin")
}

export function isMaintenancePath(pathname: string): boolean {
  return pathname.startsWith("/maintenance")
}

export function shouldBypassMaintenance(pathname: string, ip: string | null | undefined, allowedIps: Set<string>): boolean {
  if (isAdminPath(pathname) || isMaintenancePath(pathname)) return true
  if (ip && allowedIps.has(ip)) return true
  return false
}

export type MaintenanceEval = {
  enabled: boolean
  raw: string | undefined
  reason: "true" | "false" | "missing" | "invalid" | "normalized"
  warnings: string[]
}

// Evaluate MAINTENANCE_MODE with case-sensitive checks and normalization.
// - "true" => enabled
// - "false" => disabled
// - Case variations (e.g., "TRUE") normalize and warn
// - Missing/empty/invalid => disabled with warnings
export function evaluateMaintenanceMode(raw: string | undefined): MaintenanceEval {
  const warnings: string[] = []
  if (typeof raw === "undefined") {
    warnings.push("MAINTENANCE_MODE is undefined; defaulting to false. Ensure .env.local sets MAINTENANCE_MODE.")
    return { enabled: false, raw, reason: "missing", warnings }
  }
  const trimmed = String(raw).trim()
  if (trimmed === "") {
    warnings.push("MAINTENANCE_MODE is empty; defaulting to false. Use 'true' or 'false'.")
    return { enabled: false, raw, reason: "invalid", warnings }
  }
  if (trimmed === "true") return { enabled: true, raw, reason: "true", warnings }
  if (trimmed === "false") return { enabled: false, raw, reason: "false", warnings }

  const lower = trimmed.toLowerCase()
  if (lower === "true") {
    warnings.push(`MAINTENANCE_MODE="${trimmed}" normalized to "true"; prefer lowercase for consistency.`)
    return { enabled: true, raw, reason: "normalized", warnings }
  }
  if (lower === "false") {
    warnings.push(`MAINTENANCE_MODE="${trimmed}" normalized to "false"; prefer lowercase for consistency.`)
    return { enabled: false, raw, reason: "normalized", warnings }
  }

  warnings.push(`MAINTENANCE_MODE has invalid value "${trimmed}"; defaulting to false.`)
  return { enabled: false, raw, reason: "invalid", warnings }
}