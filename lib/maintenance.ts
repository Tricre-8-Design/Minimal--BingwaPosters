// Maintenance utilities: shared logic used by middleware and tests
// - isTrue: normalize boolean string values
// - parseAllowedIps: parse comma-separated IPs into a Set
// - isAdminPath: check admin route
// - isMaintenancePath: check maintenance route
// - shouldBypassMaintenance: determine if request should bypass maintenance gate

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