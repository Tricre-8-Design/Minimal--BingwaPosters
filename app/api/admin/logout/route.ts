import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyAdminToken } from "@/lib/auth/session"
import { logError } from "@/lib/server-errors"

// POST /api/admin/logout
// Clears admin session cookie and logs the action.
export async function POST(req: Request) {
  try {
    let adminId: string | null = null
    const cookieHeader = req.headers.get("cookie") || ""
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/)
    if (tokenMatch) {
      const token = decodeURIComponent(tokenMatch[1])
      try {
        const decoded = await verifyAdminToken(token)
        adminId = decoded.adminId
      } catch { }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey)
      await supabase.from("admin_logs").insert({ admin_id: adminId, action: "logout", ip: getIp(req), timestamp: new Date().toISOString() })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set("admin_session", "", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
    return res
  } catch (err) {
    // Log server-side for visibility, still clear cookie and return success
    await logError({ source: "api/admin/logout", error: err })
    const res = NextResponse.json({ success: true })
    res.cookies.set("admin_session", "", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
    return res
  }
}

function getIp(req: Request): string {
  // Check x-forwarded-for first (comma-separated list, first is original client)
  const xForwardedFor = req.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  // Check x-real-ip (single IP)
  const xRealIp = req.headers.get('x-real-ip')
  if (xRealIp) return xRealIp.trim()

  // Check Cloudflare/Vercel specific header
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  return 'unknown'
}