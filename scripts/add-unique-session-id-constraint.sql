-- Ensure unique constraint and helpful index on generated_posters.session_id
-- Run this in Supabase SQL editor

DO $$
BEGIN
  -- Add unique constraint if missing
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'generated_posters'
      AND c.conname = 'generated_posters_session_id_key'
  ) THEN
    ALTER TABLE generated_posters ADD CONSTRAINT generated_posters_session_id_key UNIQUE (session_id);
  END IF;

  -- Create index for faster lookups
  CREATE INDEX IF NOT EXISTS idx_generated_posters_session_id ON generated_posters(session_id);
END $$;

-- Optional: verify
-- SELECT * FROM pg_indexes WHERE tablename = 'generated_posters';
