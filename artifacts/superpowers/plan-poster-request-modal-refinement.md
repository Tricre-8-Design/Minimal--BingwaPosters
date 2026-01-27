# Implementation Plan - Responsive PosterRequestModal Refinement

Refine the `PosterRequestModal` component to be fully responsive on mobile and desktop, ensuring it fits within the viewport and handles overflow correctly.

## Goal
- [ ] Make the modal responsive across all screen sizes.
- [ ] Prevent viewport overflow with `max-h-[90vh]` and `overflow-y-auto`.
- [ ] Adjust mobile width to `w-[95vw]`.
- [ ] Fix desktop overlapping issues.
- [ ] Ensure image preview and form elements adapt to screen height.

## Assumptions
- The project uses Tailwind CSS for styling.
- `Dialog` components are from a UI library (shadcn/ui based).
- `max-h-[90vh]` on `DialogContent` will correctly contain the scrollable area.

## Plan

### 1. Update DialogContent Styling
- **Files**: `components/poster-request-modal.tsx`
- **Change**: 
    - Modify `DialogContent` className to include `w-[95vw] sm:w-full sm:max-w-[480px]`.
    - Add `max-h-[90vh] overflow-y-auto`.
    - Adjust padding for mobile vs desktop.
- **Verify**: Inspect the modal in a browser at various widths (320px, 768px, 1280px).

### 2. Refine Form Layout & Spacing
- **Files**: `components/poster-request-modal.tsx`
- **Change**:
    - Reduce vertical spacing in the form for mobile screens (`space-y-4` vs `space-y-6`).
    - Adjust image preview size to be more flexible (e.g., `max-h-[200px]` instead of just `aspect-video`).
    - Ensure labels and inputs are compact on small screens.
- **Verify**: Check if all form fields are visible and reachable on a small height viewport (e.g., 600px height).

### 3. Polish Image Preview & Success State
- **Files**: `components/poster-request-modal.tsx`
- **Change**:
    - Update the success state container to respect the modal's max height.
    - Ensure the "Submit" button remains accessible.
- **Verify**: Submit a test request and check the success message appearance.

## Risks & Mitigations
- **Risk**: `overflow-y-auto` on the main container might cause double scrollbars if not handled carefully with shadcn's Dialog.
- **Mitigation**: Apply overflow to the `DialogContent` itself and ensure internal elements don't force their own scrollbars unless necessary.
- **Risk**: Fixed heights might break on extremely small devices.
- **Mitigation**: Use relative units (vh, %, rem) and flexbox for adaptive layouts.

## Rollback plan
- Revert changes to `components/poster-request-modal.tsx` using git or manual undo if the layout breaks.
