-- Remove description column and add tag column to poster_templates table
-- This migration updates the database schema to match the new template requirements

-- First, add the tag column (nullable)
ALTER TABLE poster_templates 
ADD COLUMN IF NOT EXISTS tag TEXT;

-- Next, remove the description column
-- Note: This will permanently delete the description data
-- If you need to preserve the data, consider exporting it first
ALTER TABLE poster_templates 
DROP COLUMN IF EXISTS description;

-- Update existing records: set tag to NULL for all existing templates
-- This ensures consistency with the new optional tag field
UPDATE poster_templates 
SET tag = NULL 
WHERE tag IS NOT NULL;

-- Create index for faster queries on tag field
CREATE INDEX IF NOT EXISTS idx_poster_templates_tag ON poster_templates(tag);

-- Verify the changes
DO $$
BEGIN
    -- Check if description column was removed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'poster_templates' AND column_name = 'description') THEN
        RAISE NOTICE 'Warning: description column still exists in poster_templates';
    ELSE
        RAISE NOTICE 'Success: description column removed from poster_templates';
    END IF;
    
    -- Check if tag column was added
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'poster_templates' AND column_name = 'tag') THEN
        RAISE NOTICE 'Success: tag column added to poster_templates';
    ELSE
        RAISE NOTICE 'Error: tag column not found in poster_templates';
    END IF;
END $$;

-- Display the updated schema for verification
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'poster_templates'
ORDER BY ordinal_position;