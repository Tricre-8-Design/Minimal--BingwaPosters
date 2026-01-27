## Goal
Add an instruction modal to the poster customization page (`app/create/[id]/page.tsx`) that appears before the user starts editing so they know how to fill in the customization fields correctly.

## Assumptions
- The customization page is `app/create/[id]/page.tsx`.
- The project’s Radix-based Dialog is available at `components/ui/dialog.tsx` and can be used client-side.
- The modal should appear on first entry to the page (and can be dismissed).

## Plan
1. **Add modal UI imports**
   - Files: `app/create/[id]/page.tsx`
   - Change: Import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` from `@/components/ui/dialog` and any needed icons from `lucide-react`.
   - Verify: `npm run lint` (or `npm run build`) has no TS/ESLint errors.

2. **Add instruction modal state + open behavior**
   - Files: `app/create/[id]/page.tsx`
   - Change: Add `const [isInstructionsOpen, setIsInstructionsOpen] = useState(true)` and wire `Dialog open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}`.
   - Verify: Visit `/create/[id]` and confirm the modal opens automatically.

3. **Render the instruction content**
   - Files: `app/create/[id]/page.tsx`
   - Change: Add the modal content exactly as requested:
     - 📢 How to Generate Your Poster
     - Important: The offers are already set. You only need to add your specific details below.
     - Enter Prices Only: Type numbers only (e.g., 20). Do not include "Ksh" or any symbols.
     - Contact Details: Enter your Lipa na M-PESA Till Number and Phone Number exactly as they should appear.
     - Optional Pricing: If the default prices on the preview suit your needs, you can leave the price fields blank.
     - Add a primary CTA button (e.g., “Got it”) to close the modal.
   - Verify: Visual check in browser; keyboard: Tab cycles; Esc closes.

4. **Polish accessibility + layout**
   - Files: `app/create/[id]/page.tsx`
   - Change: Ensure readable spacing, semantic list, and that focus is trapped inside the dialog (Radix default). Ensure button text is clear.
   - Verify: Keyboard-only usage works; screen reader announces title/description.

## Risks & mitigations
- Risk: Modal becomes repetitive.
  - Mitigation: If needed later, add “Don’t show again” using `localStorage` keyed by template id.
- Risk: Competes with generation overlay.
  - Mitigation: Only show instructions on page entry; close before generation starts.

## Rollback plan
- Revert changes in `app/create/[id]/page.tsx` that add the dialog imports/state/JSX.
