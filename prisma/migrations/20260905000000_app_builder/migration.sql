-- NOTE: This migration originally held only the app-builder delta tables, which
-- assumed a base schema existed. On a fresh database that failed (P3018,
-- relation "Project" does not exist). The complete schema is now captured in
-- `00000000000000_init` (generated with `prisma migrate diff --from-empty`).
-- If this migration ever runs again (databases migrated before the baseline
-- existed), there is nothing left to do here — the baseline owns the schema.
SELECT 1;
