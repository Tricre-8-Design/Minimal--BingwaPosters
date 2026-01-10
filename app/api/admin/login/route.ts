import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { compare } from "bcryptjs"
import { signAdminToken } from "@/lib/auth/session"
import { safeErrorResponse } from "@/lib/server-errors"
import { emitNotification } from "@/lib/notifications/emitter"
import { NotificationType } from "@/lib/notifications/types"

// POST /api/admin/login
// Server-side login: validates credentials, enforces lockouts, issues JWT cookie (10 min), and logs actions.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email: string | undefined = body?.email?.toString().trim().toLowerCase()
    const password: string | undefined = body?.password?.toString()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: "Server misconfiguration" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id,email,password_hash,login_attempts,locked_until,role")
      .eq("email", email)
      .limit(1)
      .single()

    const ip = getIp(req)

    if (adminError || !admin) {
      // Unknown email: do not leak existence, just log failed attempt
      await supabase.from("admin_logs").insert({ admin_id: null, action: "login_failed", ip, timestamp: new Date().toISOString() })
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Check lock status
    const lockedUntil = admin.locked_until ? new Date(admin.locked_until) : null
    const now = new Date()
    if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
      await supabase.from("admin_logs").insert({ admin_id: admin.id, action: "login_failed_locked", ip, timestamp: now.toISOString() })
      return NextResponse.json({ success: false, error: "Too many failed attempts. Try again in 10 minutes." }, { status: 403 })
    }

    // Verify password
    const ok = await compare(password, admin.password_hash)
    if (!ok) {
      const attempts = typeof admin.login_attempts === "number" ? admin.login_attempts + 1 : 1
      const lockUntil = attempts >= 3 ? new Date(now.getTime() + 10 * 60 * 1000) : null
      await supabase
        .from("admins")
        .update({ login_attempts: attempts, last_attempt_at: now.toISOString(), locked_until: lockUntil?.toISOString() ?? null })
        .eq("id", admin.id)
      await supabase.from("admin_logs").insert({ admin_id: admin.id, action: attempts >= 3 ? "login_lockout" : "login_failed", ip, timestamp: now.toISOString() })
      const message = attempts >= 3 ? "Too many failed attempts. Try again in 10 minutes." : "Invalid credentials"
      return NextResponse.json({ success: false, error: message }, { status: attempts >= 3 ? 403 : 401 })
    }

    // Success: reset counters, record last_login, issue cookie
    await supabase
      .from("admins")
      .update({ login_attempts: 0, locked_until: null, last_login: now.toISOString() })
      .eq("id", admin.id)
    await supabase.from("admin_logs").insert({ admin_id: admin.id, action: "login", ip, timestamp: now.toISOString() })

    // Emit notification for admin login
    emitNotification({
      type: NotificationType.ADMIN_LOGIN,
      actor: { type: "admin", identifier: email },
      summary: `Admin login: ${email}`,
      metadata: {
        email,
        ip,
        userAgent: req.headers.get("user-agent") || "unknown",
        time: now.toISOString(),
      },
    }).catch(() => {
      // Silently ignore notification errors
    })

    const token = await signAdminToken({ adminId: String(admin.id), role: admin.role || "admin" }, 600)
    const res = NextResponse.json({ success: true })
    res.cookies.set("admin_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600, // 10 minutes
    })
    return res
  } catch (err: any) {
    // Log full details privately and return a safe, generic error
    return safeErrorResponse("api/admin/login", err, "Login failed", 500)
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