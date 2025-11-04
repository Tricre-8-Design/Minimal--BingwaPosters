-- Fix the duplicate key constraint issue on generated_posters table
-- This script removes the unique constraint that's causing the duplicate key error

-- First, let's check if the constraint exists and drop it
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop the unique constraint on placid_id if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'generated_posters_placid_id_key' 
        AND table_name = 'generated_posters'
    ) THEN
        ALTER TABLE generated_posters DROP CONSTRAINT generated_posters_placid_id_key;
        RAISE NOTICE '✅ Dropped unique constraint on placid_id';
    END IF;

    -- Drop the unique constraint on template_uuid if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'generated_posters_template_uuid_key' 
        AND table_name = 'generated_posters'
    ) THEN
        ALTER TABLE generated_posters DROP CONSTRAINT generated_posters_template_uuid_key;
        RAISE NOTICE '✅ Dropped unique constraint on template_uuid';
    END IF;

    -- Remove unique constraints that cause duplicate key errors
    DROP INDEX IF EXISTS generated_posters_placid_id_key;
    DROP INDEX IF EXISTS generated_posters_template_uuid_key;

    -- Allow multiple entries for same template and user data
    ALTER TABLE generated_posters DROP CONSTRAINT IF EXISTS generated_posters_placid_id_key;
    ALTER TABLE generated_posters DROP CONSTRAINT IF EXISTS generated_posters_template_uuid_key;

    -- Check for any other unique constraints and drop them
    FOR constraint_record IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'generated_posters' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name != 'generated_posters_pkey'
    LOOP
        EXECUTE 'ALTER TABLE generated_posters DROP CONSTRAINT ' || constraint_record.constraint_name;
        RAISE NOTICE '✅ Dropped unique constraint: %', constraint_record.constraint_name;
    END LOOP;

    RAISE NOTICE '🎯 All unique constraints removed from generated_posters table';
    RAISE NOTICE '📝 Users can now generate multiple posters with the same template and data';
END $$;
