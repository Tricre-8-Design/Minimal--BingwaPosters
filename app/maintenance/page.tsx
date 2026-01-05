import React from "react";

export default function MaintenancePage() {
  const estimated = process.env.MAINTENANCE_ESTIMATED_UNTIL || null;
  const activatedAt = process.env.MAINTENANCE_ACTIVATED_AT || null;
  const contactEmail = process.env.MAINTENANCE_CONTACT_EMAIL || "support@example.com";
  const contactPhone = process.env.MAINTENANCE_CONTACT_PHONE || "+254 790 295 408";

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <section className="w-full max-w-2xl text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-medium mb-4">
          <span className="mr-2" aria-hidden>🛠️</span>
          Poster Studio Under Maintenance
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          {["🎨", "🛠️", "⏰", "✨"].map((emoji, i) => (
            <span
              key={i}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-xl"
              aria-label={`${["Design", "Tools", "Clock", "Sparkles"][i]} icon`}
            >
              {emoji}
            </span>
          ))}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 text-gray-900">
          We’re tuning the pixels and polishing the kerning.
        </h1>
        <p className="text-gray-600 mb-6">
          Our design elves are busy upgrading the studio. Grab a coffee ☕, do a
          little doodle ✏️, and check back soon.
        </p>

        {estimated && (
          <div className="mb-4">
            <span className="font-medium text-gray-800">Estimated return:</span>
            <span className="ml-2 text-gray-700">{estimated}</span>
          </div>
        )}

        {activatedAt && (
          <div className="mb-6 text-sm text-gray-500">
            Maintenance activated at: {activatedAt}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block w-full">
          <p className="text-gray-900 font-medium">Need something urgently?</p>
          <ul className="mt-2 text-gray-700 list-disc list-inside">
            <li>
              Email:{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-blue-600 underline hover:text-blue-800"
              >
                {contactEmail}
              </a>
            </li>
            {contactPhone && (
              <li>
                Phone:{" "}
                <a
                  href={`tel:${contactPhone}`}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  {contactPhone}
                </a>
              </li>
            )}
          </ul>
        </div>

        <footer className="mt-8 text-xs text-gray-500">
          Thanks for your patience — great design takes a moment.
        </footer>
      </section>
    </main>
  );
}
