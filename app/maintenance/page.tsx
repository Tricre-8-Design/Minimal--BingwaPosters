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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 flex items-center justify-center p-6">
      <section className="w-full max-w-2xl text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-yellow-100 text-yellow-700 px-4 py-2 text-sm font-medium mb-4">
          Poster Studio Under Maintenance
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          We’re tuning the pixels and polishing the kerning.
        </h1>
        <p className="text-gray-600 mb-6">
          Our design elves are busy upgrading the studio. Grab a coffee ☕, do a
          little doodle ✏️, and check back soon.
        </p>

        {estimated && (
          <div className="mb-4">
            <span className="font-medium">Estimated return:</span>
            <span className="ml-2 text-gray-700">{estimated}</span>
          </div>
        )}

        {activatedAt && (
          <div className="mb-6 text-sm text-gray-500">
            Maintenance activated at: {activatedAt}
          </div>
        )}

        <div className="bg-gray-100 rounded-lg p-4 text-left inline-block w-full">
          <p className="text-gray-800 font-medium">Need something urgently?</p>
          <ul className="mt-2 text-gray-700 list-disc list-inside">
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

        <footer className="mt-8 text-xs text-gray-500">
          Thanks for your patience — great design takes a moment.
        </footer>
      </section>
    </main>
  )
