# Implement Poster Request Feature

## Goal
Add a way for users to request posters they don't see on the homepage. This includes a floating button, an upload/request modal, a Supabase backend for storage and tracking, and an admin management interface.

## Assumptions
- Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are configured.
- The project uses Tailwind CSS and Lucide icons.
- Admin panel is accessible and uses the existing `Tabs` structure.

## Plan

### 1. Supabase Schema & Storage Setup
- **Files**: `lib/supabase.ts`, `supabase/migrations/003_poster_requests.sql`
- **Change**: 
    - Add `PosterRequest` interface to `lib/supabase.ts`.
    - Create `poster_requests` table: `id`, `poster_url`, `description`, `phone_number`, `status` (pending/added/ignored), `created_at`.
    - Create `poster-requests` storage bucket with public upload and read policies.
- **Verify**: Check table and bucket in Supabase dashboard.

### 2. Backend: Request API Route
- **Files**: `app/api/poster-request/route.ts`
- **Change**: 
    - Create a POST endpoint that saves the request to the DB and emits a system notification using `emitNotification`.
- **Verify**: Test endpoint with Postman or `curl`.

### 3. Frontend: Request Modal & FAB
- **Files**: `components/poster-request-modal.tsx`, `app/page.tsx`
- **Change**: 
    - Build `PosterRequestModal` with image upload to Supabase Storage and form submission to the new API.
    - Add a Floating Action Button (FAB) to `app/page.tsx` to open the modal.
- **Verify**: Open modal, upload an image, and submit. Check DB for record.

### 4. Admin: Management Interface
- **Files**: `components/admin/poster-requests-content.tsx`, `app/admin/page.tsx`
- **Change**: 
    - Create `PosterRequestsContent` component for CRUD operations on requests.
    - Add "Poster Requests" tab to the admin dashboard.
- **Verify**: Navigate to Admin > Poster Requests and manage a test request.

### 5. Admin: Notifications Integration
- **Files**: `components/admin/notifications/NotificationsTable.tsx`
- **Change**: 
    - Add `POSTER_REQUEST_SUBMITTED` to the notification type filter.
- **Verify**: Check if request notifications appear and can be filtered.

## Risks & mitigations
- **Storage security**: Public upload buckets can be abused. We will rely on the "anonymous upload" requirement but recommend monitoring.
- **Input validation**: Ensure phone numbers and descriptions are validated before submission.

## Rollback plan
- Delete the `poster_requests` table and `poster-requests` bucket.
- Revert changes to `app/page.tsx` and `app/admin/page.tsx`.

Approve this plan? Reply APPROVED if it looks good.
