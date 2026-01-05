<!-- Auto-generated guidance for AI coding agents working on PosterGen -->
# PosterGen — Copilot Instructions

Summary
- Purpose: quick, actionable guidance for AI assistants to be immediately productive in this Next.js + Supabase project.
- Focus areas: architecture, key files, dev/test commands, env, patterns to follow.

Big picture
- Monorepo-style single Next.js 14 app (App Router). Server components by default; client components use `"use client"`.
- Frontend reads/writes templates and sessions from Supabase; poster generation flows: `app/api/generate/route.ts` -> uploads to Supabase Storage (`lib/storage.ts`) -> calls Placid REST -> Placid webhook -> `app/api/make/placid-callback/route.ts` updates poster record.
- Payments: M-Pesa integration in `app/api/mpesa/*` and `lib/mpesa.ts` (Daraja STK Push flow + callback in `/api/mpesa/callback`).

Key files & entrypoints (start here)
- App entry & routes: `app/` (notably `app/create/[id]/page.tsx`, `app/templates/page.tsx`, `app/download/[sessionId]/page.tsx`).
- API surface: `app/api/generate/route.ts`, `app/api/make/placid-callback/route.ts`, `app/api/mpesa/*`.
- Auth & middleware: `lib/auth/session.ts` and `middleware.ts` protect `/admin/*` routes.
- Supabase helpers: `lib/supabase.ts`, `lib/storage.ts` (image upload + public URL generation).
- Admin UI: `app/admin/*` and `components/admin/*` (templates management, transactions, feedback).

Developer workflows & commands
- Start dev server: `npm run dev` (Next.js App Router; server components default). Use `.env.local` with required env vars below.
- Build: `npm run build` and start production: `npm run start`.
- Tests: `npm run test` (Vitest) and `npm run e2e` (Playwright). Note: many tests were removed; run selectively.
- Lint: `npm run lint`.

Environment & secrets (always check `.env.local`)
- Required runtime envs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PLACID_API_KEY`, `PLACID_WEBHOOK_SUCCESS_URL`, `ADMIN_JWT_SECRET`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`.
- Maintenance toggles: `MAINTENANCE_MODE`, `MAINTENANCE_ALLOWED_IPS`, `MAINTENANCE_ACTIVATED_AT`.

Project-specific patterns & conventions
- Server vs Client: Files in `app/` default to Server Components. Keep heavy I/O and secrets on server components / API routes. When interacting with hooks or local state, add `"use client"` at the top.
- Supabase Realtime: components use realtime subscriptions for `poster_templates` and `generated_posters`. Prefer `lib/supabase.ts` helpers when subscribing and ensure cleanup to avoid memory leaks.
- Image uploads: use `lib/storage.ts` helpers (accepts DataURLs/file blobs, returns public URL for Placid). Do not reinvent filename patterns — use `posters/<sessionId>/<field>-<timestamp>.<ext>`.
- Placid webhook handling: `app/api/make/placid-callback/route.ts` implements idempotent upserts and retries — replicate that pattern for reliability.

Common pitfalls
- Middleware: `middleware.ts` blocks `/admin/*`. When adding admin routes, ensure `middleware.ts` still allows `/admin/login` and update `next.config.mjs` diagnostics if needed.
- Environment mistakes: missing `ADMIN_JWT_SECRET` causes silent redirects — check startup diagnostic printed by `next.config.mjs`.
- Realtime: Ensure Supabase Realtime is enabled for the table you expect (e.g., `public.poster_templates`).

Examples (copyable)
- Generate API call shape (used by frontend): see `README.md` and `app/api/generate/route.ts` for the exact body: `{ template_uuid, template_id, input_data, session_id }`.
- M-Pesa initiate body: `{ session_id, amount, phoneNumber }` -> `POST /api/mpesa/initiate`.

If you modify code
- Prefer updating `lib/*` helpers for shared behavior (storage, mpesa, supabase) instead of duplicating logic in pages.
- Update `README.md` if you change core flows (Placid, M-Pesa, or storage paths).
- Update the `CHANGELOG.md` for every notable changes.