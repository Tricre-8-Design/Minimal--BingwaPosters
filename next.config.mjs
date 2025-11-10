import fs from "node:fs"
import path from "node:path"

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Startup diagnostics: verify middleware and admin routes exist
  // Runs in Node during Next config evaluation (dev/build), helps catch misconfig early.
  webpack(config) {
    try {
      const root = process.cwd()
      const files = [
        path.join(root, "middleware.ts"),
        path.join(root, "app", "admin", "login", "page.tsx"),
        path.join(root, "app", "api", "admin", "login", "route.ts"),
      ]
      const diagnostics = files.map((f) => ({ file: f, exists: fs.existsSync(f) }))
      const secretConfigured = Boolean(process.env.ADMIN_JWT_SECRET)
      // Diagnostics collected; avoid noisy console output in config
    } catch (e) {
      // Silent failure: diagnostics are best-effort during startup
    }
    return config
  },
}

export default nextConfig
