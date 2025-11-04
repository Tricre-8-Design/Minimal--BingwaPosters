-- Script to verify thumbnail data in the poster_templates table
-- Run this in your Supabase SQL editor to check thumbnail storage

-- Check if poster_templates table exists and has thumbnail column
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'poster_templates' 
    AND column_name = 'thumbnail';

-- Check thumbnail data in existing templates
SELECT 
    template_id,
    template_name,
    CASE 
        WHEN thumbnail IS NULL THEN 'NULL'
        WHEN thumbnail = '' THEN 'EMPTY'
        WHEN LENGTH(thumbnail) < 100 THEN 'TOO_SHORT'
        WHEN LENGTH(thumbnail) > 1000000 THEN 'TOO_LARGE'
        ELSE 'VALID'
    END as thumbnail_status,
    LENGTH(thumbnail) as thumbnail_length,
    LEFT(thumbnail, 50) as thumbnail_preview
FROM poster_templates
ORDER BY template_name;

-- Count templates by thumbnail status
SELECT 
    CASE 
        WHEN thumbnail IS NULL THEN 'NULL'
        WHEN thumbnail = '' THEN 'EMPTY'
        WHEN LENGTH(thumbnail) < 100 THEN 'TOO_SHORT'
        WHEN LENGTH(thumbnail) > 1000000 THEN 'TOO_LARGE'
        ELSE 'VALID'
    END as status,
    COUNT(*) as count
FROM poster_templates
GROUP BY 
    CASE 
        WHEN thumbnail IS NULL THEN 'NULL'
        WHEN thumbnail = '' THEN 'EMPTY'
        WHEN LENGTH(thumbnail) < 100 THEN 'TOO_SHORT'
        WHEN LENGTH(thumbnail) > 1000000 THEN 'TOO_LARGE'
        ELSE 'VALID'
    END;
