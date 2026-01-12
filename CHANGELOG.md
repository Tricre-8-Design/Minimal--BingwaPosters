# Changelog

All notable changes to this project will be documented in this file.

## [0.5.3] - 2026-01-13

### User Experience & Payment Improvements ✅
- **Payment Flow Optimization**:
  - **Instant Success Detection**: Refined polling logic (2s frequency) to immediately detect successful payments from webhooks.
  - **Robust Verification**: Added dual-table checks (`generated_posters` and `payments`) to prevent false "pending" states.
  - **Logic**: Removed artificial delays after payment, ensuring snappy redirection to the download page.
  
- **Download Page Redesign**:
  - **Focused Layout**: completely re-organized `app/download/[sessionId]` to center-align content.
  - **Poster First**: Prioritized the poster preview at the top of the view hierarchy.
  - **Simplified Actions**: Removed redundant "Share on WhatsApp" and "Copy Link" buttons to focus on the primary "Download" action.
  
- **Feedback System Fixes**:
  - **Modal Positioning**: Fixed a layout bug where the feedback modal wasn't centering correctly by implementing a robust flex-wrapper solution that isolates it from animation transforms.
  - **Code Cleanup**: Removed duplicate imports and cleaned up syntax errors in the download page component.

## [0.5.1] - 2026-01-12

### Payment System Migration (PesaFlux) ✅
- **Migration from M-Pesa Daraja to PesaFlux**: Completed full migration of the payment processing system to PesaFlux.
  - Replaced direct M-Pesa Daraja integration with PesaFlux API for improved reliability and simpler management.
  - **New Features**:
      - `lib/pesaflux.ts`: Created new utility library for PesaFlux STK Push and phone normalization.
      - Updated API endpoints:
          - `/api/mpesa/initiate`: Now initiates transactions via PesaFlux.
          - `/api/mpesa/callback`: Handles PesaFlux webhooks (mapping `TransactionID` and `TransactionReceipt`).
  - **Cleanup**:
      - Removed legacy `lib/mpesa.ts` file.
      - Updated `README.md` with new environment variable requirements and flow descriptions.
      - Added `.env.example` template for easier setup.
## [0.5.2] - 2026-01-12

### Payment & UI/UX Security Overhaul ✅
- **Secure AI Poster Generation**:
  - Implemented immediate locking of AI-generated posters (`PosterStatus.AWAITING_PAYMENT`).
  - Added secure overlay with blur effect and "Payment Required" message on creation page.
  - Disabled right-click context menu and drag interactions on locked poster previews to prevent bypass.
  
- **Payment Flow & Page Redesign**:
  - **Relocking Loop Fix**: Resolved critical bug where paid posters would revert to locked status due to race conditions.
  - **Enhanced UI**: Redesigned `/payment/[sessionId]` page with:
    - Glassmorphism card design (`bg-surface/95`).
    - Clearer STK Push instructions and countdown timer.
    - Polling mechanism optimization to verify payment via both `payments` table and `generated_posters` status.
    - Optimistic UI updates to prevent status flickering.

- **Celebratory Download Experience**:
  - **Redesign**: Complete overhaul of `/download/[sessionId]` page.
  - **Confetti Animation**: Added `canvas-confetti` celebration on successful page load.
  - **Feedback System**: Integrated rating and comment modal for user feedback after download.
  - **Suggestions**: Added "You might also like" section with suggested templates.
  - **Visuals**: Animated background elements, glowing buttons, and improved typography.

- **Technical Improvements**:
  - Added `@types/canvas-confetti` for TypeScript support.
  - Refined Supabase query logic for payment status verification.
  - Improved error handling in payment polling loop.


## [0.5.0] - 2026-01-10

### Engine-Specific Maintenance Mode System ✅
- **Feature Overview**: Implemented comprehensive maintenance control system for Placid and AI poster generation engines
  - Allows independent management of Placid and AI engine availability
  - Admin can enable/disable each engine separately during maintenance or issues
  - Users receive clear, customizable maintenance messages when engines are unavailable
  - System designed to prevent failed poster attempts during service disruptions
  
- **Database Schema**:
  - Created `system_settings` table for centralized system configuration
  - Stores maintenance status and messages for each engine as JSONB: `{enabled: boolean, message: string}`
  - Includes audit trail (updated_at, updated_by) for changes
  - Migration file: `supabase/migrations/002_system_maintenance.sql`
  - Default settings for both engines (disabled by default)
  
- **Admin Dashboard Integration**:
  - New "System Settings" tab in admin panel (`app/admin/page.tsx`)
  - Dedicated maintenance controls for each engine:
    - **Placid Engine Card**: Toggle switch + custom message editor (blue theme)
    - **AI Engine Card**: Toggle switch + custom message editor (purple theme)
  - Real-time save status indicators (success/error feedback)
  - Visual alerts showing active maintenance status with user-facing messaging
  - File: `components/admin/system-settings-content.tsx`
  
- **Backend Implementation**:
  - `lib/engine-maintenance.ts`: Core maintenance checking utilities
    - `checkMaintenanceStatus(engine)`: Check if specific engine is under maintenance
    - `getAllMaintenanceStatus()`: Get status for all engines
    - Console logging for debugging database reads
  - **API Endpoints**:
    - `POST /api/admin/system-settings`: Update maintenance settings
    - `GET /api/admin/system-settings`: Fetch all settings
    - `GET /api/maintenance-status`: Public endpoint for users to check status
      - Force-dynamic rendering to prevent Next.js caching
      - Cache-Control headers: `no-store, no-cache, must-revalidate`
      - Timestamp query parameters for browser cache-busting
  - **Generation Routes**:
    - Updated `/api/generate` (Placid): Checks maintenance before processing
    - Updated `/api/generate-ai` (AI): Checks maintenance before processing
    - Returns 503 status with maintenance message when engine is locked
  
- **User Interface Integration**:
  - **Homepage** (`app/page.tsx`):
    - Two separate maintenance modals (one for Classic Posters, one for Instant Posters)
    - Classic Posters modal: Orange theme with warning icon
    - Instant Posters modal: Purple theme with lightning icon
    - Smart alternation suggestions when one engine is down
    - "Switch to Available Engine" button when applicable
    - Auto-refresh maintenance status every 30 seconds
  - **Create Page** (`app/create/[id]/page.tsx`):
    - Maintenance alert display above form
    - Form disabled when engine is under maintenance
    - Alternative engine suggestions
    - Generation blocking at button click level
  - **Components**:
    - `components/ui/maintenance-alert.tsx`: Reusable alert component
    - `components/ui/switch.tsx`: Created using Radix UI primitives
  
- **Technical Features**:
  - Proper server-side Supabase client configuration:
    - Fixed `supabaseAdmin` to use service role key instead of browser client
    - Prevents caching issues with admin operations
    - Disabled session persistence for server-side operations
  - Cache prevention strategies:
    - Next.js route config: `export const dynamic = 'force-dynamic'`
    - HTTP headers: Cache-Control, Pragma, Expires
    - Client-side timestamp parameters: `?t=${Date.now()}`
  - Fail-open design: If maintenance check fails, allows generation to proceed
  - No technical terminology exposed to users (e.g., "Placid" → "Classic Poster Studio")
  
- **Bug Fixes**:
  - Fixed 401 unauthorized errors by removing cookie authentication requirements
  - Fixed Supabase caching issues by creating proper admin client
  - Fixed Next.js route segment caching with dynamic rendering
  - Fixed browser cache issues with timestamp parameters
  - Fixed admin UI terminology to avoid revealing underlying technology stack
  - Non-blocking architecture: Maintenance checks fail-open for reliability
  - Atomic database updates with audit trail
  - Customizable messages per engine for better user communication
  - Real-time status updates in admin UI
  - Timestamp tracking for all maintenance changes
  
- **Files Created** (8 new files):
  - `supabase/migrations/002_system_maintenance.sql`
  - `lib/engine-maintenance.ts`
  - `app/api/admin/system-settings/route.ts`
  - `app/api/maintenance-status/route.ts`
  - `components/admin/system-settings-content.tsx`
  - `components/ui/maintenance-alert.tsx`
  - `lib/hooks/useMaintenanceStatus.ts`
  - `scripts/run-maintenance-migration.sql`
  
- **Files Modified** (3 files):
  - `app/admin/page.tsx`: Added System Settings tab
  - `app/api/generate/route.ts`: Added Placid maintenance check
  - `app/api/generate-ai/route.ts`: Added AI maintenance check

## [0.4.0] - 2026-01-10

### Production Cleanup ✅
- **Removed Test Files**: Cleaned up all test-related files for production deployment
  - Deleted `lib/__tests__/` directory (mpesa.test.ts, maintenance.test.ts)
  - Deleted `e2e/` directory and all end-to-end test files
  - Removed `vitest.config.ts` configuration file
  
- **Removed SQL Scripts**: Cleaned up standalone SQL files (migrations preserved)
  - Deleted root-level SQL files: 
    - `add-poster-failed-notification.sql`
    - `add-poster-failed-templates.sql`
    - `create_staging_table.sql`
    - `fix-placid-uuid-type.sql`
    - `update-email-template.sql`
    - `update-poster-failed-templates.sql`
  - Kept: `supabase/migrations/001_notification_system.sql` (required for deployment)
  - Kept: `scripts/admin_logs.sql` and `scripts/create-error-logs.sql` (required for database setup)
  
- **Removed Documentation Files**: Streamlined documentation to essentials only
  - Deleted implementation guides:
    - `ALL_FEATURES_COMPLETE.md`
    - `DEBUG_STAGING.md`
    - `ENV_SETUP.md`
    - `NEW_FEATURES_CODE.md`
    - `NOTIFICATION_IMPLEMENTATION_SUMMARY.md`
    - `NOTIFICATION_SYSTEM.md`
    - `PLACID_IMPORT_FIXES.md`
    - `PLACID_IMPORT_WORKFLOW.md`
    - `STAGED_SECTION_CODE.txt`
    - `STAGING_COMPLETE.md`
    - `STAGING_IMPLEMENTATION_GUIDE.md`
  - Kept: `README.md` (project documentation) and `CHANGELOG.md` (version history)
  
- **Impact**: Reduced repository size and removed development-only files, keeping only production-necessary code and documentation



### Major Features - Staging Posters System ✅
- **Complete Staged Posters Workflow**: Implemented a full staging system for reviewing and publishing Placid templates before they go live
  - **Staging Display Section**: Yellow/orange card with pulsing indicator shows all pending templates
  - **Conditional Rendering**: Section only appears when `stagingTemplates.length > 0`
  - **Template Cards**: Each staged template displays name, UUID, layer count, "Pending" badge, and action buttons
  - **Review & Publish Flow**: Click "Review & Publish" to open pre-populated form with all template data
  - **Form Pre-population**: Converts `placid_layers` to `fields_required` format automatically
  - **Publishing Logic**: Updates both `poster_templates` (insert) and `placid_template_staging` (status='completed') atomically
  - **Smart Button Text**: Changes based on context (Create/Update/Publish to Templates)
  - **Delete from Staging**: Red trash icon button allows removing templates from staging with confirmation dialog
  
- **Database Integration**:
  - Created `placid_template_staging` table with status tracking (pending/completed)
  - Auto-refresh functionality updates both lists after publishing
  - Status-based filtering ensures only pending templates display in UI

- **Files Modified**:
  - `components/admin/templates-content.tsx`: ~150 lines added/modified
  - Added staging state management, fetch logic, and UI components

### Placid Import System - Complete Overhaul ✅
- **Pagination Support**: Now fetches ALL templates from Placid API, not just first page
  - Iterates through pages until no more data exists
  - Console logs show progress: "Page 1: Fetched X templates"
  - Successfully retrieves all 43+ templates from Placid account
  
- **Dual Import Modes**:
  - **"Import All Available"**: Bulk import with checkbox selection
  - **"Import Single by UUID"**: Manual UUID entry for specific template import
  - Mode selector tabs in import modal for easy switching
  
- **Single UUID Import Flow**:
  - Text input field for UUID entry
  - "Fetch" button to load single template
  - Uses existing `/api/admin/placid/templates/[uuid]` endpoint
  - Normalizes fields same as bulk import
  
- **Import Workflow Improvements**:
  - Templates now import to staging table first (not directly to `poster_templates`)
  - Shows "imported" vs "skipped" counts in success toast
  - Filters out already-imported templates automatically
  - Field conversion: Placid layers → Template fields with proper type mapping

- **Files Modified**:
  - `app/api/admin/placid/templates/route.ts`: Added pagination loop
  - `components/admin/templates-content.tsx`: Added mode selector, UUID input, fetch logic

### Notification System - Complete Implementation ✅
- **Architecture**: Non-invasive, isolated notification system for transactional emails and SMS
  
- **Core Components**:
  - `lib/notifications/emitter.ts`: Single entry point (`emitNotification`)
  - `lib/notifications/dispatcher.ts`: Processes pending deliveries
  - `lib/notifications/render.ts`: Template variable substitution
  - `lib/notifications/channels/email.ts`: Make.com webhook integration
  - `lib/notifications/channels/sms.ts`: Blaze Tech SMS API integration
  
- **Database Schema**: 5 new tables
  - `notification_users`: Admins who receive notifications
  - `notification_templates`: Customizable email/SMS templates per event
  - `notification_user_settings`: Per-user preferences for each notification type
  - `notification_events`: Audit log of all triggered events
  - `notification_deliveries`: Queue and delivery history
  
- **Event Types Monitored**:
  - `ADMIN_LOGIN`: Admin login events
  - `TEMPLATE_CREATED`: New poster template creation
  - `POSTER_GENERATED`: Successful poster generation
  - `PAYMENT_SUCCESS`: M-Pesa payment success
  - `PAYMENT_FAILED`: M-Pesa payment failure
  - `POSTER_DOWNLOADED`: User downloads poster
  - `POSTER_REVIEW_SUBMITTED`: User submits feedback
  - `POSTER_GENERATION_FAILED`: Failed poster generation
  
- **Admin UI - Two New Tabs**:
  - **Notifications Tab**: View event history, filter by type, expand for details, real-time delivery status
  - **Notification Users Tab**: CRUD operations, per-user/per-event preferences, toggle email/SMS channels
  - **Users & Messages tab**: View all users, send messages to specific users, view sent messages
  
- **Integration Points**:
  - `/api/admin/login` → `ADMIN_LOGIN`
  - `/api/generate` → `POSTER_GENERATED`
  - `/api/mpesa/callback` → `PAYMENT_SUCCESS` / `PAYMENT_FAILED`
  - `/api/download` → `POSTER_DOWNLOADED`
  
- **Design Principles**:
  - Never blocks main application flow
  - Errors caught and logged silently
  - All `emitNotification()` calls wrapped in `.catch()`
  - Original user actions always succeed even if notifications fail
  
- **Files Created** (24 new files):
  - `supabase/migrations/001_notification_system.sql`
  - Complete notification library in `lib/notifications/`
  - Admin UI components in `components/admin/notifications/`
  - `NOTIFICATION_SYSTEM.md` comprehensive documentation
  
- **Files Modified** (5 files):
  - `app/admin/page.tsx`: Added notification tabs
  - API routes for event hooks

### AI Poster Generation - Nano Banana Pro Integration ✅
- **Switched from Imagen 4 to Nano Banana Pro**: Google's advanced AI model via Replicate
  - Better text rendering capabilities
  - Support for reference image input
  - More accurate layout reproduction
  
- **Image Input Feature**:
  - Uses `poster_reference` from template as reference image
  - Passes full URL array to `image_input` parameter
  - Ensures accurate replication of blueprint layout and style
  
- **Strict Rendering System Prompt**:
  - Adapted from Gemini-style prompting
  - Forces AI to act as literal renderer, not creative designer
  - Absolute rules: no layout changes, no color changes, no text rephrasing
  - Blueprint-based rendering with exact specification enforcement
  
- **Blueprint Processing**:
  - Extracts all `variable_text` fields and defaults from blueprint
  - Merges user input with default values
  - Validates required fields (errors if no user value AND no default)
  - Injects final values into blueprint using `injectFieldValues()`
  
- **Output Handling**:
  - Downloads image from Replicate
  - Uploads to Supabase Storage (`generated_posters` bucket)
  - Generates public URL
  - Creates record in `generated_posters` table with `status: COMPLETED`
  
- **API Endpoint**: `POST /api/generate-ai`
  - Engine type validation: HARD FAIL for non-AI templates
  - Blueprint integrity validation
  - Reference image support
  - 2K resolution output in PNG format
  - Aspect ratio support: 1:1 or 16:9
  
- **Environment Variables**:
  - `REPLICATE_API_TOKEN`: Required for Replicate API access
  
- **Files Modified**:
  - `app/api/generate-ai/route.ts`: Complete rewrite with Nano Banana Pro
  - `package.json`: Added `replicate@^1.4.0` dependency
  - `ENV_SETUP.md`: Added Replicate documentation

### Admin Panel - UI Improvements ✅
- **Notification Tabs Enhancement**:
  - Improved color contrast for notification and user tabs on white backgrounds
  - Redesigned settings section in user management tab for better aesthetics
  - Modernized "Edit" and "Settings" buttons with contemporary styling
  
- **Templates Management Updates**:
  - Added "Refresh Templates" button with loading state
  - Supabase Realtime subscriptions for `poster_templates`
  - Instant UI updates for additions, edits, and deletions without manual refresh
  - Thumbnail link field: Accepts public URLs or Supabase Storage paths
  - Live thumbnail preview updates
  
- **Typography Improvements**:
  - Better text visibility across admin interface
  - Consistent color scheme with primary orange (`#ff4b0e`)
  
### Technical Improvements ✅
- **Database**:
  - Created `placid_template_staging` table with RLS policies
  - Added indexes for performance (`idx_placid_staging_status`)
  - Notification system tables with proper relationships
  
- **API Enhancements**:
  - Pagination support in Placid template fetching
  - Single UUID fetch endpoint working correctly
  - Replicate API integration for AI generation
  - Make.com webhook integration for email notifications
  - Blaze Tech SMS API integration
  
- **State Management**:
  - Added `stagingTemplates` state in templates component
  - Import mode state (`importMode`: "all" | "single")
  - Single UUID state for manual imports
  - Notification users and settings state management
  
- **Error Handling**:
  - Comprehensive error logging for staging operations
  - Silent notification failures (non-blocking)
  - Retry logic for failed notification deliveries (up to 3 attempts)
  - Provider response logging in `notification_deliveries`

### Documentation ✅
- **New Documentation Files**:
  - `STAGING_COMPLETE.md`: Complete staging implementation guide
  - `STAGING_IMPLEMENTATION_GUIDE.md`: Step-by-step implementation details
  - `ALL_FEATURES_COMPLETE.md`: Summary of all 3 major features
  - `NOTIFICATION_SYSTEM.md`: Comprehensive notification system docs
  - `NOTIFICATION_IMPLEMENTATION_SUMMARY.md`: Implementation checklist
  - `PLACID_IMPORT_WORKFLOW.md`: Import workflow documentation
  - `PLACID_IMPORT_FIXES.md`: Import bug fixes and improvements
  - `DEBUG_STAGING.md`: Troubleshooting guide for staging issues
  - `ENV_SETUP.md`: Environment variable configuration guide

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
