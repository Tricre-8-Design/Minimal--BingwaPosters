## Global Foundation
- Files: [layout.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/layout.tsx)
- Apply bg-app and text-text-primary on the root html/body wrapper and main container.
- Enforce consistent vertical spacing on sections (e.g., py-8/py-12 across pages) without altering component structure.
- Replace all page backgrounds using bg-white → bg-app.
- Replace raw gray text utilities (text-gray-*, text-blue-*, text-purple-*) → semantic text tokens (text-text-primary, text-text-secondary, text-text-muted, text-text-inverse as appropriate).
- Keep animations reserved for entry/hover; avoid layout shift animations.

## Shared UI Elements
- Files:
  - [card.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/components/ui/card.tsx)
  - [button.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/components/ui/button.tsx)
  - [input.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/components/ui/input.tsx)
  - [textarea.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/components/ui/textarea.tsx)
  - [select.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/components/ui/select.tsx)
  - [label.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/components/ui/label.tsx)
- Cards: add bg-app-elevated rounded-xl shadow-md hover:shadow-lg transition-all animate-fadeUp as base styles (preserve className merges).
- Buttons: standardize variants without changing logic/props:
  - Primary actions → bg-success hover:bg-success-hover text-text-inverse shadow-sm.
  - Secondary actions → bg-accent hover:bg-accent-hover text-text-inverse.
  - System/navigation → bg-primary hover:bg-primary-hover text-text-inverse.
  - Maintain disabled, focus states; add focus:ring-primary.
- Inputs (and Textarea/Select): bg-white border-border text-text-primary placeholder:text-text-muted focus:ring-primary focus:border-primary shadow-xs; ensure adequate contrast.

## User Pages
- Landing / Template Listing: [page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/page.tsx)
  - Page container: bg-app text-text-primary.
  - Header section: wrap in elevated card (bg-app-elevated shadow-md rounded-xl) with animate-fadeUp.
  - Template cards: grid with gap-6; each card gets bg-app-elevated shadow-md rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all.
  - Replace all raw colors (bg-white, text-blue-*, bg-indigo-*, bg-purple-*) with theme tokens.

- Template Preview / Generator:
  - Templates list: [templates/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/templates/page.tsx)
    - Page: bg-app.
    - Cards/lists: use elevated card style and fadeUp entry.
  - Generator: [create/[id]/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/create/%5Bid%5D/page.tsx)
    - Split layout: preview area + controls with gap; controls in bg-app-elevated rounded-xl shadow-md.
    - CTA buttons emphasized using bg-success hover:bg-success-hover text-text-inverse.
    - Replace text-white, bg-purple-*, bg-blue-* with tokens.
  - Progress: [(user)/progress/[id]/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/(user)/progress/%5Bid%5D/page.tsx)
    - Background: bg-app; status chips use success/info/danger.
    - Cards and sections adopt elevated style and animate-fadeUp.

- Payment / Confirmation:
  - Payment: [payment/[sessionId]/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/payment/%5BsessionId%5D/page.tsx)
    - Centered card layout: container uses min-h-screen grid place-items-center; card bg-app-elevated shadow-md rounded-xl.
    - Success messages use bg-success-soft text-success.text; errors use text-danger bg-app-elevated.
    - Replace any raw colors and ensure contrast.
  - Download/Confirmation: [download/[sessionId]/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/download/%5BsessionId%5D/page.tsx)
    - Same centered elevated card; CTA buttons use success; info states use info.

## Admin Dashboard
- Overview / Dashboard: [admin/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/admin/page.tsx)
  - Card-based stats: grid of bg-app-elevated shadow-md rounded-xl; numbers text-text-primary with high contrast.
  - Soft background bg-app; strong cards with hover:shadow-lg.

- Tables / Logs: [admin/feedback/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/admin/feedback/page.tsx)
  - Page bg-app; table surface bg-white with border-border; header row bg-app-elevated.
  - Clear row separation: divide-y divide-border; status badges use success/info/danger/warning.
  - Replace text-gray-* with text-text-* tokens.

- Forms / Settings: [admin/templates/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/admin/templates/page.tsx), [admin/login/page.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/BingwaPoster%20Generator/Minimal--BingwaPosters/app/admin/login/page.tsx)
  - Group fields into elevated cards; clear section headers text-text-secondary.
  - Inputs styled per shared elements; submission buttons use bg-primary or bg-success based on context.

## Cleanup & Consistency
- Remove all raw Tailwind color utilities: bg-white, text-white, text-gray-*, bg-indigo-*, bg-purple-*, text-blue-*, bg-blue-*, bg-emerald-*.
- Replace with semantic tokens:
  - Backgrounds: bg-app, bg-app-elevated, bg-success-soft.
  - Text: text-text-primary, text-text-secondary, text-text-muted, text-text-inverse.
  - Borders: border-border.
  - Status: text-success, text-danger, text-warning, text-info, bg-success-soft.
  - Focus/active: focus:ring-primary, ring-primary, shadow-glow where appropriate.
- Ensure every page has visual separation between background, surface, and text.
- Animations only on entry or hover: animate-fadeUp or animate-scaleIn; avoid animating layout shifts.
- Validate contrast on each page: avoid white-on-white; never set background and text to the same color.

## Implementation Order
1) Global foundation (layout.tsx).
2) Shared elements (card, button, inputs).
3) User pages in order: Landing → Templates → Generator → Progress → Payment → Download.
4) Admin pages in order: Overview → Tables/Logs → Forms/Settings.
5) Final cleanup pass: search-and-replace residual raw utilities; visual QA for contrast and consistency.
