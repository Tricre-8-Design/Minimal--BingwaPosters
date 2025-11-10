import { SignJWT, jwtVerify } from "jose"

// Admin session token helpers (10-minute expiry)
// Creates and verifies a JWT stored in an HTTP-only cookie.

const issuer = "bingwa-posters-admin"
const audience = "admin"

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) throw new Error("ADMIN_JWT_SECRET not configured")
  return new TextEncoder().encode(secret)
}

export async function signAdminToken(payload: { adminId: string; role?: string }, expiresInSeconds = 600) {
  const secret = getSecretKey()
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({ sub: payload.adminId, role: payload.role || "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(now + expiresInSeconds)
    .sign(secret)
}

export async function verifyAdminToken(token: string) {
  const secret = getSecretKey()
  const { payload } = await jwtVerify(token, secret, { issuer, audience })
  return { adminId: String(payload.sub), role: String(payload.role || "admin") }
}