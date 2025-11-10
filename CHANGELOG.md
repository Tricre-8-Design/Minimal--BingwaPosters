# Changelog

All notable changes to this project will be documented in this file.

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