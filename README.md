# PosterGen - Professional Poster Generator Platform

## Table of Contents
1. [Project Overview](#project-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Design](#database-design)
5. [Data Flow & Workflows](#data-flow--workflows)
6. [Integrations & External Services](#integrations--external-services)
7. [Environment Configuration](#environment-configuration)
8. [Developer Notes](#developer-notes)
9. [Setup Instructions](#setup-instructions)
10. [Example Workflows](#example-workflows)
11. [New Functionality](#new-functionality)
12. [Changelog](#changelog)

---

## Project Overview

### What is PosterGen?

PosterGen is a Next.js-based web application that enables users to create professional posters for various purposes without design skills. The platform provides:

- **Template Library**: Pre-designed poster templates for different categories (Data, SMS, Minutes, Announcements, Others)
- **Customization Engine**: Drag-and-drop interface to personalize templates with user data
- **Payment Integration**: Secure payments via M-Pesa (Daraja STK Push) for downloads
- **Admin Dashboard**: Comprehensive admin panel for managing templates, viewing analytics, tracking feedback, and monitoring transactions
- **Automated Workflow**: Direct Placid 2.0 REST API for backend poster generation

### Core Features & User Workflows

#### **User Side**
1. **Browse Templates** - Users visit the homepage to view available templates with search and category filtering
2. **Preview & Customize** - Select a template and customize it by filling in required fields
3. **Generate Poster** - Submit customization data to generate a poster image
4. **Payment** - Pay via M-Pesa STK Push to download the generated poster
5. **Download** - Download the finalized poster image

#### **Admin Side**
1. **Dashboard** - Monitor platform metrics (total posters generated, daily trends, transaction history)
2. **Template Management** - Add, edit, and manage poster templates with categories and fields
3. **Feedback Management** - Review user feedback and ratings for quality improvement
4. **Transactions** - Track all payments and poster generation sessions

---

## Frontend Architecture

### Framework & Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18 with Tailwind CSS
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom glass morphism effects
- **Icons**: Lucide React
- **Form Handling**: React Hook Form + Zod validation
- **Charts**: Recharts for data visualization
- **State Management**: React hooks with real-time Supabase subscriptions
- **Database Client**: @supabase/ssr (browser client for frontend)

### Folder Structure

\`\`\`
app/
├── layout.tsx              # Root layout with fonts and metadata
├── globals.css             # Global styles, Tailwind config, custom animations
├── fonts.ts                # Font imports (Inter, Poppins)
├── page.tsx                # Default homepage redirecting to templates
├── templates/
│   └── page.tsx            # Main template browsing interface (default page)
├── create/[id]/
│   └── page.tsx            # Poster customization page
├── payment/[sessionId]/
│   └── page.tsx            # Payment page (M-Pesa integration)
├── download/[sessionId]/
│   └── page.tsx            # Download confirmation page
├── (user)/progress/[id]/
│   └── page.tsx            # Generation progress tracking (URL: /progress/[id])
├── api/generate/route.ts    # Poster generation API (Placid REST)
└── admin/
    ├── layout.tsx          # Admin layout (no sidebar)
    ├── page.tsx            # Admin dashboard with tabs
    ├── login/page.tsx      # Admin login page

components/
├── ui/                     # shadcn/ui components (button, card, tabs, etc.)
├── admin/
│   ├── dashboard-content.tsx      # Dashboard tab with metrics and charts
│   ├── templates-content.tsx      # Templates management tab
│   ├── feedback-content.tsx       # Feedback management tab
│   └── transactions-content.tsx   # Transactions tab

lib/
├── supabase.ts            # Supabase client, database types, helper functions
├── mpesa.ts               # M-Pesa (Daraja) payment gateway utilities
└── utils.ts               # Utility functions

hooks/
├── use-mobile.ts          # Mobile viewport detection
└── use-toast.ts           # Toast notifications

public/
└── placeholder.svg        # Placeholder images
\`\`\`

## New Functionality

### Supabase Storage Utility (`lib/storage.ts`)
- Adds image upload helpers targeting the `assets` bucket.
- Accepts DataURLs and File blobs, validates common image types (PNG/JPEG/WebP/SVG), and enforces max size.
- Generates sanitized filenames: `posters/<sessionId>/<field>-<timestamp>.<ext>`.
- Returns public URLs suitable for Placid layers; errors are surfaced with concise messages.

### Generation Status Overlay (`components/ui/generation-status.tsx`)
- Full-screen, accessible status UI with real-time updates via Supabase Realtime.
- Uses `react-loading-indicators` `Riple` for custom animations; rotating humorous messages; stage-based feedback.
- Dynamically imported with `ssr: false`; spinner library lazy-loaded on client with CSS fallback to avoid server vendor-chunk resolution issues.
- Auto-closes when `generated_posters.image_url` arrives via `INSERT`/`UPDATE` events.
- Integrated into `app/create/[id]/page.tsx`; replaces prior inline spinner.

### Reliable Placid Callback (`app/api/make/placid-callback/route.ts`)
- Adds verification checks and retry logic when updating `generated_posters.image_url`.
 - Ensures idempotent upsert on missing rows and marks `status: "COMPLETED"`.
- Structured logging of all URL update operations for debugging.

### Server Integration (`app/api/generate/route.ts`)
- Uploads incoming image fields to Supabase Storage and passes clean public URLs to Placid.
- Upserts poster records with `template_name` and `status` fields.

## Changelog

### 2025-11-07
- Replace inline loading UI with `GenerationStatus` overlay.
- Add `lib/storage.ts` for robust image handling and public URL generation.
- Improve Placid callback reliability with verification + retry.
- Align dependencies to Next 14 + React 18.

### Key Pages & Components

#### **Templates Page (app/templates/page.tsx)**
- Default homepage displaying all available templates
- **Features**: Real-time search, category filtering, favorites, preview modal
- **Data Source**: Supabase `poster_templates` table with real-time updates

#### **Create Page (app/create/[id]/page.tsx)**
- Template customization interface
- Dynamic form fields based on template's `fields_required` array
- Image upload capability
- **Integrations**: Supabase (template fetch + realtime), Placid REST API (poster generation), M-Pesa (payment)

#### **Admin Dashboard (app/admin/page.tsx)**
- **Tabs**: Dashboard, Templates, Feedback, Transactions
- **Sticky Navigation**: Tab bar remains visible while scrolling
- **Dashboard Tab**: Metrics cards with time filters, daily generation chart
- **Templates Tab**: Full template management CRUD operations
- **Feedback Tab**: Minimal interface with search and status filters (All/New/Reviewed)
- **Transactions Tab**: Payment tracking and analytics

### State Management & Data Fetching

- **Server Components**: Used for initial data loading in layouts
- **Client Components**: React hooks (useState, useContext) for local state
- **Real-time Subscriptions**: Supabase channels for template updates
- **Example**: Homepage listens to `poster_templates` changes and refreshes automatically

---

## Backend Architecture

### Framework & Runtime

- **Framework**: Next.js 14 with App Router
- **Runtime**: Node.js (Server-side)
- **API Routes**: Located in `app/api/`
- **Active Endpoints**: `/api/mpesa/initiate`, `/api/mpesa/callback`, `/api/generate`

### API Endpoints

#### **POST /api/mpesa/initiate**
**Purpose**: Initiate Daraja STK Push to user's phone

**Request Body**:
\`\`\`json
{
  "session_id": "session-uuid",
  "amount": 50,
  "phoneNumber": "+254700000000"
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "session_id": "session-uuid",
  "amount": 50,
  "phone": "254700000000",
  "CheckoutRequestID": "ws_CO_XXXXXXXXXX",
  "MerchantRequestID": "XXXXXXXXXX",
  "CustomerMessage": "Success. Request accepted for processing"
}
\`\`\`

**What Happens**:
1. Validates session and inserts a pending payment row (`status: "Pending"`)
2. Calls Daraja `processrequest` to trigger STK Push
3. Stores `CheckoutRequestID` in `payments` (`mpesa_code` field)

#### **POST /api/mpesa/callback**
**Purpose**: Handle Daraja STK callback and update payment status

**Request Body (from Safaricom)**:
\`\`\`json
{
  "Body": {
    "stkCallback": {
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CheckoutRequestID": "ws_CO_XXXXXXXXXX",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 50 },
          { "Name": "MpesaReceiptNumber", "Value": "XXXXXXXXXX" },
          { "Name": "PhoneNumber", "Value": 254700000000 },
          { "Name": "AccountReference", "Value": "session-uuid" }
        ]
      }
    }
  }
}
\`\`\`

**What Happens**:
1. Marks payment as `Paid` when `ResultCode === 0`, saving receipt
2. Otherwise marks payment as `Failed`
3. Links by `CheckoutRequestID` or latest pending row by phone

### Placid 2.0 REST Integration

**Purpose**: Generate poster images directly from backend using Placid REST API

**Backend Route**: `POST /api/generate`
**Request Body**:
\`\`\`json
{
  "template_uuid": "placid-template-uuid",
  "template_id": "Temp0001",
  "input_data": {
    "name": "John Doe",
    "event_date": "2025-08-20",
    "location": "Nairobi",
    "phone": "+254700000000"
  },
  "session_id": "session-uuid"
}
\`\`\`

**Flow**:
- Backend calls Placid REST with template and layers

---

## Testing

- Unit tests (Vitest): `npm run test`
- E2E example (Playwright): `npm run e2e` (ensure the dev server is running)

### Headline Text Transition

- The home page headline uses a rotating text transition for short phrases, implemented via `HeadlineRotator`.
- Animation uses `opacity` and `transform` (cross-browser safe), with timing synchronized to `intervalMs`.
- Accessibility: respects `prefers-reduced-motion` (no auto-rotation), and announces changes via a `sr-only` status element with `aria-live="polite"`.
- Usage:

```tsx
import HeadlineRotator from "@/components/ui/headline-rotator"

<HeadlineRotator
  phrases={["Choose Your Vibe", "Design posters fast", "No designer? No problem"]}
  intervalMs={4000}
  className="text-4xl md:text-5xl mb-4 font-space"
/>
```

- Fallbacks: if reduced motion is enabled or a browser doesn’t support CSS animations, the headline displays the first phrase without animating.

## Forced Download API

- Endpoint: `GET /api/download?url=<imagePublicUrl>&filename=<optional>`
- Streams image bytes with `Content-Disposition: attachment` to force a download while preserving content type.
- Use this when CDNs return inline images and you want consistent downloads.

## Feedback Modal (Download Page)

- After successful download on `app/download/[sessionId]`, a modal prompts for rating (1–5) and optional comment.
- Input validation lives in `lib/validation.ts` (receipt, rating, comment). Data saves to Supabase `feedback` with `created_at`.

## Admin Dashboard Updates


## Authentication Flow & Route Configuration

- Middleware: `middleware.ts` protects `"/admin/:path*"` and allows `"/admin/login"` to load without a session.
- Session: successful login issues an HTTP-only `admin_session` cookie (10-minute expiry).
- Verification: `lib/auth/session.ts` signs/verifies JWTs using `HS256` and `ADMIN_JWT_SECRET`.
- API: `POST /api/admin/login` validates credentials against Supabase and logs attempts.

### Middleware Behavior
- For any `"/admin/*"` request except `"/admin/login"`:
  - Missing `admin_session` → logs `Missing admin_session token` and redirects to `/admin/login`.
  - Invalid or expired token → logs the error and redirects to `/admin/login`.
  - Misconfiguration (missing `ADMIN_JWT_SECRET`) → logs and redirects to `/admin/login`.

### Error Logging
- Server errors are logged via `lib/server-errors.ts`:
  - Always logs to server console.
  - Optional webhook `LOG_WEBHOOK_URL`.
  - Optional Supabase private table `error_logs` when `SUPABASE_SERVICE_ROLE_KEY` is set.
- Middleware uses `logError` for missing tokens, invalid tokens, and env misconfiguration.
- Admin login API wraps errors with `safeErrorResponse` for friendly client messages.

### Route Verification on Startup
- `next.config.mjs` prints a startup diagnostic with:
  - Presence of `middleware.ts`, `app/admin/login/page.tsx`, `app/api/admin/login/route.ts`.
  - Whether `ADMIN_JWT_SECRET` is configured.
  - Expected matcher: `/admin/:path*`.
- This helps surface misconfigurations behind the "Cannot find the middleware module" error.

### Required Environment Variables
- `ADMIN_JWT_SECRET` — secret for admin JWT signing/verifying.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for server-side operations (private logging).
- `LOG_WEBHOOK_URL` — optional webhook for error logs.

### Troubleshooting
- Middleware module error:
  - Ensure `middleware.ts` exists at repo root and exports `middleware`.
  - Verify `lib/auth/session.ts` import path in `middleware.ts` is `./lib/auth/session`.
  - Confirm `ADMIN_JWT_SECRET` is set; missing secret now logs explicitly.
- 404 on `/admin/login`:
  - Ensure `app/admin/login/page.tsx` exists and default-exports a component.
  - Check startup diagnostics in terminal to confirm route presence.
  - Middleware allows `pathname.startsWith('/admin/login')` — trailing slashes and assets are permitted.

### Flow Summary
- User visits `/admin/login` → no middleware block → submits email/password.
- Server `POST /api/admin/login` validates and sets `admin_session` cookie.
- Subsequent `/admin/*` requests pass middleware when token is valid.
- Failures produce clear client messages and full server-side logs.

- Payments and feedback now use `created_at` for ordering and metrics (with legacy `time` as fallback where present).
- Transactions tab shows `mpesa_code`, `image_url`, `amount`, and `created_at`.
- Feedback tab loads real Supabase data, supports realtime updates.
- Placid returns image URL and status
- Record inserted into Supabase
- Frontend displays via Supabase Realtime

---

## Database Design

### Database: Supabase PostgreSQL

### Tables

#### **1. poster_templates**
Stores all available poster templates

| Column | Type | Purpose |
|--------|------|---------|
| `template_id` | TEXT (PK) | Unique identifier (e.g., "Temp0001") |
| `template_name` | TEXT | Display name |
| `template_uuid` | UUID (UNIQUE) | UUID for Placid integration |
| `description` | TEXT | Template description |
| `category` | TEXT | Category (Data, SMS, Minutes, Announcements, Others) |
| `price` | NUMERIC | Price in KES (default: 50) |
| `thumbnail` | TEXT | Base64-encoded preview image |
| `fields_required` | JSONB | Array of field definitions |
| `is_active` | BOOLEAN | Whether template is available |
| `created_at` | TIMESTAMP | Creation time |

**fields_required Structure**:
\`\`\`json
[
  {
    "name": "name",
    "label": "Customer Name",
    "type": "text",
    "required": true
  },
  {
    "name": "poster_image",
    "label": "Upload Image",
    "type": "image",
    "required": false
  }
]
\`\`\`

#### **2. generated_posters**
Tracks all poster generation sessions

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID (PK) | Unique record ID |
| `template_id` | TEXT (FK) | Which template was used |
| `session_id` | UUID (UNIQUE) | Unique user session |
| `phone_number` | TEXT | User's phone |
| `image_url` | TEXT | Generated poster URL |
| `status` | TEXT | 'pending', 'generated', 'failed', 'downloaded' |
| `created_at` | TIMESTAMP | Generation time |
| `downloaded_at` | TIMESTAMP | When user downloaded |

#### **3. payments**
Payment transaction records

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID (PK) | Unique payment ID |
| `session_id` | UUID (FK) | Links to generated_posters |
| `phone_number` | TEXT | Customer phone (M-Pesa) |
| `amount` | NUMERIC | Amount in KES |
| `status` | TEXT | 'Pending', 'Paid', 'Failed' |
| `mpesa_code` | TEXT | STK `CheckoutRequestID` or receipt number |
| `image_url` | TEXT | Poster image URL (for convenience) |
| `created_at` | TIMESTAMP | Payment time |

#### **4. feedback**
User reviews and ratings

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID (PK) | Unique feedback ID |
| `template_id` | TEXT (FK) | Template being reviewed |
| `phone_number` | TEXT | Reviewer's phone |
| `rating` | INTEGER | 1-5 star rating |
| `comment` | TEXT | Written feedback |
| `status` | TEXT | 'new', 'reviewed', 'archived' |
| `created_at` | TIMESTAMP | Feedback time |

#### **5. hero_texts, 6. testimonials, 7. site_settings, 8. notifications**
Additional tables for CMS and admin features (detailed schema available in code)

---

## Data Flow & Workflows

### Complete User Journey

\`\`\`
1. User visits homepage (/templates)
   ↓ Fetch from poster_templates table
   ↓ Display templates with real-time updates

2. User searches/filters templates
   ↓ Local client-side filtering
   ↓ Updates displayed results

3. User clicks "Customize"
   ↓ Navigate to /create/[templateId]
   ↓ Fetch template details from database
   ↓ Render dynamic form

4. User fills form and submits
   ↓ Send customization data to backend `/api/generate`
   ↓ Backend calls Placid REST and inserts generated_posters record
   ↓ Placid returns image URL (Realtime UI updates)

5. User sees poster and clicks "Download"
   ↓ Redirect to /payment/[sessionId]
   ↓ STK Push sent to user's phone
   ↓ User authorizes on phone

6. Callback confirms payment
   ↓ /api/mpesa/callback receives confirmation
   ↓ Update `payments` record (status: Paid)
   ↓ Update generated_posters record if needed

7. User redirected to /download/[sessionId]
   ↓ Download poster image
   ↓ Mark as downloaded in database
\`\`\`

### Real-Time Updates

Templates subscription enables instant updates when admin adds/modifies templates:
\`\`\`javascript
supabase
  .channel('template-changes')
  .on('postgres_changes', { event: '*', table: 'poster_templates' }, payload => {
    // All connected clients refresh template list
    fetchTemplates()
  })
  .subscribe()
\`\`\`

---

## Integrations & External Services

### 1. **Supabase (Database & Real-time)**

**Environment Variables**:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (server-only)
\`\`\`

**Usage**: Real-time database queries, subscriptions, storage (future)

### 2. **M-Pesa Daraja (Payment Gateway)**

**Environment Variables**:
\`\`\`
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-paybill-or-till
MPESA_PASSKEY=your-lnm-passkey
MPESA_CALLBACK_URL=https://your-domain/api/mpesa/callback
MPESA_ENVIRONMENT=production # or sandbox
\`\`\`

**Flow**: User → STK Push to phone → User authorizes → Callback confirmation → Payment recorded

### 3. **Placid 2.0 (Poster Generation)**

**Environment Variables**:
\`\`\`
PLACID_API_KEY=your-placid-api-token
\`\`\`

**Flow**: Backend calls Placid REST → Returns image URL → User downloads after payment

---

## Environment Configuration

### Required Environment Variables

**Create `.env.local` file in project root**:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# M-Pesa Daraja
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-paybill-or-till
MPESA_PASSKEY=your-lnm-passkey
MPESA_CALLBACK_URL=https://your-domain/api/mpesa/callback
# Preferred env variable (falls back to MPESA_ENVIRONMENT if not set)
MPESA_ENV=sandbox
# Optional override; if unset, derived from MPESA_ENV
MPESA_BASE_URL=https://sandbox.safaricom.co.ke

# Placid 2.0
PLACID_API_KEY=your-placid-api-token

# Server-only
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_JWT_SECRET=your-strong-random-secret
\`\`\`

### Admin Authentication Setup

- Session: Admin auth uses a short-lived JWT stored in an HTTP-only cookie (`admin_session`) with a 10-minute expiry.
- Backend: Credentials are verified server-side against Supabase `admins` table (`email`, `password_hash` using bcrypt), with lockout enforcement.
- Logging: All admin actions (login, logout, failed attempts) are recorded in `admin_logs`.

Required steps:

- Create `admin_logs` table in Supabase. Run the SQL in `scripts/admin_logs.sql` via Supabase SQL editor.
- Ensure the `admins` table matches your schema (including `login_attempts`, `locked_until`). Store hashed passwords using bcrypt.
- Add `ADMIN_JWT_SECRET` to `.env.local` with a strong random value.
- Do not expose service keys in client; `SUPABASE_SERVICE_ROLE_KEY` is server-only and used in API routes.

Security notes:

- All `/admin/*` routes are protected by middleware that requires a valid session token.
- The login page shows generic errors ("Invalid credentials" or "Too many failed attempts. Try again in 10 minutes.") without revealing whether an email exists.
- Debug/console logs are suppressed in the login flow and admin UI.

### Local Development Setup

\`\`\`bash
# 1. Clone and install
git clone <repo>
cd postgen
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Set up Supabase tables (run SQL in Supabase dashboard)
# See database schema SQL in source code

# 4. Run development server
npm run dev
# Navigate to http://localhost:3000

# 5. Build for production
npm run build
npm run start
\`\`\`

---

## Developer Notes

### Key Files

- **lib/supabase.ts**: Database types, helper functions (renderThumbnail, showToast, fileToBase64)
- **lib/mpesa.ts**: M-Pesa (Daraja) helpers and STK Push initiation
- **app/api/generate/route.ts**: Placid REST generation endpoint
- **app/admin/page.tsx**: Admin dashboard with tabs

### Common Patterns

\`\`\`typescript
// Fetch templates with real-time updates
const { data: templates } = await supabase
  .from('poster_templates')
  .select('*')

// Generate via backend Placid REST API
await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_uuid,
    template_id,
    input_data: formData,
    session_id,
  }),
})

// Initiate M-Pesa STK Push
await fetch('/api/mpesa/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id, amount: priceKES, phoneNumber })
})
\`\`\`

### Error Logging & Troubleshooting

Error handling is centralized to avoid leaking technical details to users while capturing full diagnostics privately.

- Backend uses `lib/server-errors.ts` to log errors to a private Supabase table (`error_logs`) and/or an optional webhook.
- Client uses `lib/client-errors.ts` to show short, friendly messages and to wrap fetch calls with retries.

Setup:

1. Run `scripts/create-error-logs.sql` in Supabase to create the `public.error_logs` table with RLS allowing only the `service_role`.
2. Optionally set `LOG_WEBHOOK_URL` in `.env.local` to forward server errors to your observability endpoint.

Environment:

- `SUPABASE_SERVICE_ROLE_KEY` must be present on the server for logging to Supabase.
- `LOG_WEBHOOK_URL` (optional) for external error forwarding.

| Issue | Solution |
|-------|----------|
| "Supabase connection failed" | Check env vars and ensure tables exist in Supabase |
| "Placid API key not configured" | Verify PLACID_API_KEY in .env.local |
| "M-Pesa STK Push failed" | Verify Daraja credentials and callback URL |
| "Thumbnails not loading" | Ensure `templates-thumbnails` bucket exists and public ACL, verify `thumbnail_path` is set, and use `getThumbnailUrl(path)` |
| "Port 3000 in use" | Kill process with `lsof -i :3000` or use different port |

---

## Setup Instructions

### Quick Start

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment**
   \`\`\`bash
   cp .env.example .env.local
  # Fill in Supabase, M-Pesa, and Placid API key
   \`\`\`

3. **Set Up Database**
   - Go to Supabase dashboard
   - Create tables using provided SQL schema
   - Add test template to `poster_templates`

4. **Run Dev Server**
   \`\`\`bash
   npm run dev
   # Navigate to http://localhost:3000
   \`\`\`

5. **Test Complete Flow**
   - Browse templates on homepage
   - Customize and generate poster
  - Test M-Pesa payment (use sandbox credentials)
   - Download generated poster

### Production Deployment (Vercel)

\`\`\`bash
# Push to GitHub
git push origin main

# In Vercel dashboard:
# 1. Connect GitHub repository
# 2. Add environment variables (non-public keys)
# 3. Deploy

# URLs
Production: Your Vercel domain
Dashboard: https://vercel.com/dashboard
\`\`\`

---

## Example Workflows

### Adding a New Template

1. Admin navigates to `/admin` → Templates tab
2. Clicks "Add New Template"
3. Fills: Name, Category, Price, Description
4. Uploads thumbnail image (converts to base64)
5. Defines fields (Name, Date, Image, etc.)
6. Clicks "Save"
7. Supabase triggers real-time update
8. All users see new template instantly

### Complete Purchase Flow

1. User searches for "business" template
2. Clicks "Customize" on template card
3. Fills customization form (Name, Phone, Company Logo)
4. Clicks "Generate"
5. Backend calls Placid; poster generated → Returns image URL
6. User sees preview and clicks "Download"
7. STK Push sent to user's phone
8. User authorizes on phone
9. Payment confirmed via callback
10. User redirected to download page
11. Poster image displayed and downloadable

### Admin Dashboard Monitoring

1. Admin logs in at `/admin`
2. Views Dashboard tab:
   - Today's Generated Posters: 12
   - This Week: 87
   - Chart showing daily generation trends
3. Clicks Feedback tab
4. Searches for feedback or filters by status
5. Marks feedback as reviewed
6. Checks Transactions tab for payment history
7. Monitors all system metrics

---

## Architecture Summary

PosterGen combines Next.js frontend, Supabase PostgreSQL database, M-Pesa Daraja payments, and Placid 2.0 REST poster generation into a complete platform. Users browse templates, customize them, pay via M-Pesa, and download professional posters. Admins manage the entire system through a streamlined dashboard with real-time updates and comprehensive analytics.

\`\`\`
[Frontend: React/Next.js] 
    ↓
[Database: Supabase PostgreSQL]
[Payment: M-Pesa (Daraja STK Push)]
[Generation: Placid REST API]
\`\`\`

---

## Deployment

Your project is live at:

**[https://vercel.com/tricre8team-8963s-projects/v0-fork-of-kenyan-ai-website](https://vercel.com/tricre8team-8963s-projects/v0-fork-of-kenyan-ai-website)**

## Continue Building

Build your app on:

**[https://v0.app/chat/QTsfYmgb7Yh](https://v0.app/chat/QTsfYmgb7Yh)**

---

*This README serves as complete technical documentation for the PosterGen platform. For questions or issues, refer to the troubleshooting section or consult the inline code documentation.*
