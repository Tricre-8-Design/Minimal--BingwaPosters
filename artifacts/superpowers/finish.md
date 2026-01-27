## Verification
- `npm run build` — PASS
- `npm run lint` — FAIL (`eslint` not installed; script is `eslint .` but no devDependency)

## Summary of changes
- Added an instruction modal to the create/customization page so users see guidance before filling fields.
- Modal copy matches the provided instructions and includes a clear “Got it, Let's Go!” CTA.
- Updated changelog entry for this feature.

## Files changed
- `app/create/[id]/page.tsx`
- `CHANGELOG.md`
- `artifacts/superpowers/plan.md`
- `artifacts/superpowers/execution.md`

## Manual validation
1. Run `npm run dev`.
2. Open `/templates` and click any poster template.
3. On `/create/[id]`, confirm the instruction modal opens immediately.
4. Confirm:
   - Esc closes the modal.
   - Clicking “Got it, Let's Go!” closes the modal.
   - Focus lands on the CTA button when the modal opens.

## Follow-ups (optional)
- Fix lint script by adding `eslint` + `eslint-config-next`, or change `lint` to `next lint`.
