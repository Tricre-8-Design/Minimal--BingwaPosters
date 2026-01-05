# Changelog

All notable changes to this project will be documented in this file.

## [0.2.3] - 2026-01-04

### UI Refinements
- **Background**: Removed the background gradient animation (`animate-gradientMove`) completely to provide a static, calm background and eliminate any potential visual distraction or "blinking" effects.
- **Background Animation**: Previously slowed down, now fully removed for stability.
- **Spacing**: Increased vertical spacing between the headline rotator and the tagline in `app/page.tsx` to prevent text overlap.
- **Typography**: Changed the text color of "Kila mtu ana style yake!" to `text-success` (Green) for better emphasis.
- **Animation**: Smoothed out the background gradient animation (`gradientMove`) by using a ping-pong keyframe sequence (`0% -> 50% -> 100%`) and increasing the duration to 20s, eliminating the "blinking" jump effect.
- **Config**: Added `success` color palette to `tailwind.config.ts`.

## [0.2.2] - 2026-01-04

### Visual Overhaul & Rebranding
- **Global Theme**:
  - Introduced a bold animated gradient background (`#FF4B0E` to `#677AE5`) across the entire application.
  - Implemented glassmorphism design language with elevated, semi-transparent white surfaces (`backdrop-blur-md`).
  - Added subtle floating icons (Sparkles, Stars, Layouts) with vertical drift animation for a lively, premium feel.

- **Components**:
  - **BackgroundWrapper**: Created a reusable wrapper component to enforce consistent background and floating animations across all pages.
  - **Buttons**: Redesigned with vivid gradients, glowing shadows (`shadow-glowOrange`, `shadow-glowBlue`), and hover lift effects. Primary actions now use Orange, Secondary use Blue.
  - **Cards**: Updated to use `bg-surface` (white with transparency) and `shadow-card` for depth.
  - **Inputs**: Styled with semi-transparent backgrounds (`bg-white/80`) and focus rings matching the new primary color.

- **Pages Updated**:
  - **User Side**: Home, Template Gallery, Poster Creator, Payment, and Download pages now fully utilize the new design system.
  - **Admin Side**: Dashboard and Login pages updated to match the global branding while maintaining data density.
  - **Loading Screen**: Refactored to align with the new gradient theme, using the `BackgroundWrapper` for consistency.

- **Technical**:
  - Updated `tailwind.config.ts` with new color tokens (`gradient-from`, `gradient-to`, `surface`), shadows, and keyframe animations (`drift`, `gradientMove`, `float`).
  - Removed legacy raw color utilities in favor of semantic tokens.

## [0.2.1] - 2026-01-04

### UI Updates
- **Loading Screen**:
  - Implemented a 3-second minimum duration for the loading animation to ensure a smooth branded experience.
  - Updated the loading screen background to a custom gradient (`#390FFF` to `#B25CFF`).
  - Added individual colors to falling background icons for better vibrancy.
  - Replaced the default spinner with a custom branded loading experience in `app/loading.tsx` and `app/page.tsx`.
  - Added a "breathing" logo animation and falling background icons (Sparkles, Stars, etc.).
  - Centralized loading logic into `components/loading-screen.tsx` for consistency.

- **Visual Fixes**:
  - Fixed "Choose Your Vibe" headline visibility issue on white backgrounds.
  - Implemented a gradient text effect (`from-success to-primary`) with a new `animate-gradient-x` animation.
  - Removed hardcoded `text-white` from `HeadlineRotator` to allow flexible text coloring.

- **Theme & Config**:
  - Added `gradient-x` keyframes and animation to `tailwind.config.ts`.
  - Ensured manual loading states in `HomePage` match the global loading design.

## [0.2.0] - 2026-01-03

### UI Redesign & Visual Overhaul
- **Global Theme**:
  - Implemented a new vibrant color system with "Electric Blue" primary and "Vivid Purple" accent colors.
  - Replaced raw colors with semantic tokens (`bg-app`, `text-primary`, `bg-app-elevated`) for consistent theming across light and dark modes.
  - Added new `glass` utilities and smoother transition animations (`transition-smooth`).

- **Navbar**:
  - **Sticky Positioning**: Header now stays fixed at the top with a `backdrop-blur-md` glass effect.
  - **Visuals**: Updated logo with a gradient background and pulse animation.
  - **Interactivity**: Added hover effects and improved spacing.

- **Hero Section**:
  - **Modern Layout**: Removed "faded white" background effects in favor of clean, vibrant gradient blobs (`blur-3xl`).
  - **Typography**: Increased font sizes and improved spacing (`py-20`) for a more contemporary look.
  - **Search**: Redesigned search bar with a glowing gradient border effect.

- **Components**:
  - **Buttons**:
    - Updated to use "Solid fill" vibrant colors by default.
    - Added `shadow-md`, hover lift animations (`scale-105`), and larger touch targets (`h-11`).
    - Standardized variants (`default`, `outline`, `ghost`).
  - **Cards**:
    - Implemented `bg-app-elevated` for better contrast against the new background.
    - Added subtle hover scaling and shadow effects.
  - **Modals**:
    - Redesigned Template Preview Modal to be centered with a split-view layout (Image + Details).
    - Simplified interface, improved padding, and added `scaleIn` entrance animations.
  - **Filters**:
    - Redesigned category pills with modern borders and active state styling.

- **Technical**:
  - Updated `tailwind.config.ts` to support new semantic color tokens.
  - Refactored `app/page.tsx` to align with the new design system.

## [0.1.1] - 2025-11-10

### Cleanup
- Removed unused SQL scripts from `scripts/`:
  - `add-unique-session-id-constraint.sql`
  - `complete-database-setup.sql`
  - `create-admin-tables.sql`
  - `fix-duplicate-key-issue.sql`
  - `fix-thumbnail-storage.sql`
  - `update-poster-status-enum.sql`
  - `update-poster-templates-schema.sql`
  - `update-template-schema-remove-description-add-tag.sql`
  - `verify-thumbnail-data.sql`
- Kept active, documented scripts:
  - `scripts/admin_logs.sql`
  - `scripts/create-error-logs.sql`
- Deleted redundant files not used by build/runtime:
  - `styles/globals.css` (unused; `app/globals.css` is the active stylesheet)
  - `pnpm-lock.yaml` (project standardizes on npm; `package-lock.json` retained)

### Notes
- No changes to runtime code or database connection logic.
- Database initialization remains via Supabase dashboard using the two kept SQL files.
- Backups/archival: removed files were not referenced by code, CI, or docs; restore from VCS history if needed.
