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

---

## Project Overview

### What is PosterGen?

PosterGen is a Next.js-based web application that enables users to create professional posters for various purposes without design skills. The platform provides:

- **Template Library**: Pre-designed poster templates for different categories (Data, SMS, Minutes, Announcements, Others)
- **Customization Engine**: Drag-and-drop interface to personalize templates with user data
- **Payment Integration**: Secure payment processing via Paystack (M-Pesa) for poster downloads
- **Admin Dashboard**: Comprehensive admin panel for managing templates, viewing analytics, tracking feedback, and monitoring transactions
- **Automated Workflow**: Integration with Make.com for backend poster generation (HTML to image conversion)

### Core Features & User Workflows

#### **User Side**
1. **Browse Templates** - Users visit the homepage to view available templates with search and category filtering
2. **Preview & Customize** - Select a template and customize it by filling in required fields
3. **Generate Poster** - Submit customization data to generate a poster image
4. **Payment** - Pay via Paystack M-Pesa to download the generated poster
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
- **UI Library**: React 19 with Tailwind CSS
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
│   └── page.tsx            # Payment page (Paystack integration)
├── download/[sessionId]/
│   └── page.tsx            # Download confirmation page
├── progress/[id]/
│   └── page.tsx            # Generation progress tracking
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
├── make-webhook.ts        # Make.com webhook integration
├── paystack.ts            # Paystack payment gateway integration
└── utils.ts               # Utility functions

hooks/
├── use-mobile.ts          # Mobile viewport detection
└── use-toast.ts           # Toast notifications

public/
└── placeholder.svg        # Placeholder images
\`\`\`

### Key Pages & Components

#### **Templates Page (app/templates/page.tsx)**
- Default homepage displaying all available templates
- **Features**: Real-time search, category filtering, favorites, preview modal
- **Data Source**: Supabase `poster_templates` table with real-time updates

#### **Create Page (app/create/[id]/page.tsx)**
- Template customization interface
- Dynamic form fields based on template's `fields_required` array
- Image upload capability
- **Integrations**: Supabase (template fetch), Make webhook (poster generation), Paystack (payment)

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
- **Active Endpoints**: `/api/paystack/webhook/route.ts`

### API Endpoints

#### **POST /api/paystack/webhook**
**Purpose**: Handle Paystack payment confirmation

**Request Body**:
\`\`\`json
{
  "event": "charge.success",
  "data": {
    "reference": "bingwa_1734567890_session-uuid",
    "status": "success",
    "amount": 50000,
    "metadata": {
      "sessionId": "session-uuid",
      "templateId": "Temp0001",
      "phone": "+254700000000"
    }
  }
}
\`\`\`

**What Happens**:
1. Verifies webhook signature
2. Updates `payments` table with status "Paid"
3. Links payment to `generated_posters` record
4. Returns success response

### Make.com Webhook Integration

**Purpose**: Generate poster images from template + user data

**Webhook Payload** (new JSON structure):
\`\`\`json
{
  "templateId": "Temp0001",
  "fields": {
    "name": "John Doe",
    "event_date": "2025-08-20",
    "location": "Nairobi",
    "phone": "+254700000000"
  },
  "session_id": "session-uuid",
  "generated_poster_id": "poster-uuid",
  "timestamp": "2025-01-14T01:05:12.000Z"
}
\`\`\`

**Make Flow**:
- Receives webhook with template ID and field values
- Looks up template definition
- Renders HTML with user values
- Converts to image (PNG/JPG)
- Uploads to storage
- Returns image URL

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
| `template_uuid` | UUID (UNIQUE) | UUID for Placid/Make integration |
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
| `status` | TEXT | 'pending', 'success', 'failed' |
| `paystack_reference` | TEXT | Paystack transaction ref |
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
   ↓ Send customization data to Make webhook
   ↓ Create generated_posters record (status: pending)
   ↓ Make generates image and returns URL

5. User sees poster and clicks "Download"
   ↓ Redirect to /payment/[sessionId]
   ↓ Paystack payment modal opens
   ↓ User completes M-Pesa auth

6. Paystack webhook confirms payment
   ↓ /api/paystack/webhook receives confirmation
   ↓ Create payments record (status: success)
   ↓ Update generated_posters record

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

### 2. **Paystack (Payment Gateway)**

**Environment Variables**:
\`\`\`
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_or_test_key
PAYSTACK_SECRET_KEY=sk_live_or_test_key (server-only)
\`\`\`

**Flow**: User → Paystack modal → M-Pesa auth → Webhook confirmation → Payment recorded

### 3. **Make.com (Poster Generation)**

**Environment Variables**:
\`\`\`
NEXT_PUBLIC_MAKE_WEBHOOK_URL=https://hook.make.com/your-scenario
\`\`\`

**Flow**: User submits customization → Make renders poster → Returns image URL → User downloads after payment

---

## Environment Configuration

### Required Environment Variables

**Create `.env.local` file in project root**:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_or_test_key

# Make.com
NEXT_PUBLIC_MAKE_WEBHOOK_URL=https://hook.make.com/your-webhook

# Server-only (optional)
PAYSTACK_SECRET_KEY=sk_live_or_test_key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

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
- **lib/make-webhook.ts**: Make.com webhook integration
- **lib/paystack.ts**: Paystack payment initialization
- **app/admin/page.tsx**: Admin dashboard with tabs

### Common Patterns

\`\`\`typescript
// Fetch templates with real-time updates
const { data: templates } = await supabase
  .from('poster_templates')
  .select('*')

// Send to Make webhook
await sendToMakeWebhook({
  templateId, 
  fields: formData,
  session_id, 
  timestamp
})

// Initialize Paystack payment
payWithPaystack({
  email, phone, amountKES,
  sessionId, templateId,
  onSuccess, onCancel, onError
})
\`\`\`

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Supabase connection failed" | Check env vars and ensure tables exist in Supabase |
| "Make webhook URL not configured" | Verify NEXT_PUBLIC_MAKE_WEBHOOK_URL in .env.local |
| "Paystack payment failed" | Check if using test/live keys correctly |
| "Thumbnails not loading" | Use verifyThumbnailData() to debug base64 data |
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
   # Fill in Supabase, Paystack, and Make webhook URLs
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
   - Test Paystack payment (use test credentials)
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
5. Make.com renders poster → Returns image URL
6. User sees preview and clicks "Download"
7. Paystack modal opens
8. User enters M-Pesa details
9. Payment confirmed via webhook
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

PosterGen combines Next.js frontend, Supabase PostgreSQL database, Paystack payment processing, and Make.com poster generation into a complete platform. Users browse templates, customize them, pay via M-Pesa, and download professional posters. Admins manage the entire system through a streamlined dashboard with real-time updates and comprehensive analytics.

\`\`\`
[Frontend: React/Next.js] 
    ↓
[Database: Supabase PostgreSQL]
[Payment: Paystack + M-Pesa]
[Generation: Make.com Webhooks]
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
