-- Ensure poster_status enum supports new gating flow values
-- Run this in your Supabase SQL editor

DO $$
BEGIN
  -- Add 'PROCESSING' if missing
  BEGIN
    ALTER TYPE poster_status ADD VALUE 'PROCESSING';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add 'AWAITING_PAYMENT' if missing
  BEGIN
    ALTER TYPE poster_status ADD VALUE 'AWAITING_PAYMENT';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add 'COMPLETED' if missing
  BEGIN
    ALTER TYPE poster_status ADD VALUE 'COMPLETED';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Add 'FAILED' if missing
  BEGIN
    ALTER TYPE poster_status ADD VALUE 'FAILED';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Optionally convert generated_posters.status to poster_status enum (if currently TEXT)
-- ALTER TABLE generated_posters
--   ALTER COLUMN status TYPE poster_status USING UPPER(status)::poster_status;

-- Verify
-- SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'poster_status';