import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAdminToken } from "./lib/auth/session"
import { logError } from "./lib/server-errors"

// Protect all /admin/* routes. Always require a valid admin_session cookie.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only guard /admin routes, but allow access to the login page itself
  if (!pathname.startsWith("/admin")) {
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
  matcher: ["/admin/:path*"],
}