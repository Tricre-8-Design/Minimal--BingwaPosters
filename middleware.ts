import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAdminToken } from "./lib/auth/session"
import { logError } from "./lib/server-errors"
import { evaluateMaintenanceMode, parseAllowedIps, shouldBypassMaintenance } from "./lib/maintenance"

function getClientIp(req: NextRequest): string {
  // Prefer x-forwarded-for; fallback to req.ip if available
  const fwd = req.headers.get("x-forwarded-for") || ""
  const ip = (fwd.split(",")[0] || "").trim()
  // Some environments provide req.ip
  // @ts-expect-error - NextRequest may carry ip depending on runtime
  return ip || (req.ip as string) || ""
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin")
}

function isMaintenancePage(pathname: string): boolean {
  return pathname.startsWith("/maintenance")
}

// Protect all /admin/* routes. Always require a valid admin_session cookie.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Maintenance mode gate — applies to all non-admin paths
  const evalResult = evaluateMaintenanceMode(process.env.MAINTENANCE_MODE)
  // Console warnings for misconfiguration (case variation, invalid, missing)
  for (const w of evalResult.warnings) {
    console.warn(`[maintenance] ${w}`)
    await logError({ source: "middleware/maintenance/env", error: new Error(w), statusCode: 200 })
  }
  if (evalResult.enabled) {
    const allowedIps = parseAllowedIps(process.env.MAINTENANCE_ALLOWED_IPS)
    const ip = getClientIp(req) || null
    const bypass = shouldBypassMaintenance(pathname, ip, allowedIps)

    await logError({
      source: "middleware/maintenance",
      error: new Error(bypass ? "Maintenance access allowed" : "Maintenance access blocked"),
      statusCode: bypass ? 200 : 503,
      meta: { pathname, ip, allowedIps: Array.from(allowedIps.values()) },
    })

    if (!bypass) {
      const url = req.nextUrl.clone()
      url.pathname = "/maintenance"
      url.search = ""
      return NextResponse.redirect(url)
    }
  }

  // Only guard /admin routes, but allow access to the login page itself
  if (!isAdminPath(pathname)) {
    return NextResponse.next()
  }

  // Allow login route and any nested assets under it
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next()
  }

  const token = req.cookies.get("admin_session")?.value
  if (!token) {
    // Missing cookie: log event for visibility
    await logError({
      source: "middleware/auth",
      error: new Error("Missing admin_session token"),
      statusCode: 401,
      meta: { pathname },
    })
    const url = req.nextUrl.clone()
    url.pathname = "/admin/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  try {
    // Validate required env at runtime to surface misconfig early
    if (!process.env.ADMIN_JWT_SECRET) {
      await logError({
        source: "middleware/auth",
        error: new Error("ADMIN_JWT_SECRET not configured"),
        statusCode: 500,
        meta: { pathname },
      })
      const url = req.nextUrl.clone()
      url.pathname = "/admin/login"
      url.search = ""
      return NextResponse.redirect(url)
    }

    await verifyAdminToken(token)
    return NextResponse.next()
  } catch (err: any) {
    await logError({
      source: "middleware/auth",
      error: err,
      statusCode: 401,
      meta: { pathname },
    })
    const url = req.nextUrl.clone()
    url.pathname = "/admin/login"
    url.search = ""
    return NextResponse.redirect(url)
  }
}

export const config = {
  // Apply middleware broadly, excluding Next.js internals and common static assets
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}