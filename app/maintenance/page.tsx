import React from "react"

// Maintenance page
// Shows friendly, humorous, design-themed message with optional estimated downtime
// and contact details. Server component reads environment variables.

export default function MaintenancePage() {
  const estimated = process.env.MAINTENANCE_ESTIMATED_UNTIL || null
  const activatedAt = process.env.MAINTENANCE_ACTIVATED_AT || null
  const contactEmail = process.env.MAINTENANCE_CONTACT_EMAIL || "support@example.com"
  const contactPhone = process.env.MAINTENANCE_CONTACT_PHONE || null

  return (
    <main
      className="min-h-screen text-white flex items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(164deg, rgba(103, 122, 229, 1) 0%, rgba(117, 77, 165, 1) 100%)",
      }}
    >
      <section className="w-full max-w-2xl text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium mb-4 backdrop-blur">
          <span className="mr-2" aria-hidden>🛠️</span>
          Poster Studio Under Maintenance
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur text-xl" aria-label="Design icon">🎨</span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur text-xl" aria-label="Tools icon">🛠️</span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur text-xl" aria-label="Clock icon">⏰</span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur text-xl" aria-label="Sparkles icon">✨</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          We’re tuning the pixels and polishing the kerning.
        </h1>
        <p className="text-white/80 mb-6">
          Our design elves are busy upgrading the studio. Grab a coffee ☕, do a
          little doodle ✏️, and check back soon.
        </p>

        {estimated && (
          <div className="mb-4">
            <span className="font-medium">Estimated return:</span>
            <span className="ml-2 text-white/90">{estimated}</span>
          </div>
        )}

        {activatedAt && (
          <div className="mb-6 text-sm text-white/70">
            Maintenance activated at: {activatedAt}
          </div>
        )}

        <div className="bg-white/10 border border-white/20 rounded-lg p-4 text-left inline-block w-full backdrop-blur">
          <p className="text-white font-medium">Need something urgently?</p>
          <ul className="mt-2 text-white/90 list-disc list-inside">
            <li>
              Email: <a href={`mailto:${contactEmail}`} className="underline">{contactEmail}</a>
            </li>
            {contactPhone && (
              <li>
                Phone: <a href={`tel:${contactPhone}`} className="underline">{contactPhone}</a>
              </li>
            )}
          </ul>
        </div>

        <footer className="mt-8 text-xs text-white/70">
          Thanks for your patience — great design takes a moment.
        </footer>
      </section>
    </main>
  )
}