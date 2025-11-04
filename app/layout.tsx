import type React from "react"
import type { Metadata } from "next"
import { inter, poppins } from "./fonts"
import "./globals.css"

export const metadata: Metadata = {
  title: "Poster Generator - Create Professional Posters Instantly",
  description: "Generate professional posters for your business in seconds. No design skills required.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-inter antialiased">{children}</body>
    </html>
  )
}
