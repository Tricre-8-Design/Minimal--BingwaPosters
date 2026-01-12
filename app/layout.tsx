import type React from "react"
import type { Metadata } from "next"
import { inter, poppins } from "./fonts"
import "./globals.css"

export const metadata: Metadata = {
  title: "Bingwa Poster Generator - Create Professional Bingwa Posters Instantly",
  description: "Generate professional posters for your business in seconds. No design skills required.",
  generator: 'Wazimu Creator',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-inter antialiased bg-app text-text-primary min-h-screen relative overflow-x-hidden">
        {/* Global content wrapper with consistent fade-in */}
        <div className="section-fade-in">{children}</div>
      </body>
    </html>
  )
}
