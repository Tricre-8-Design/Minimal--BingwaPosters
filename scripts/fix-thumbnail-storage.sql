-- Script to fix thumbnail storage issues
-- This will help ensure thumbnails are properly stored as base64

-- First, let's see what we're working with
SELECT 
    template_id,
    template_name,
    CASE 
        WHEN thumbnail IS NULL THEN 'No thumbnail'
        WHEN thumbnail = '' THEN 'Empty string'
        WHEN thumbnail LIKE 'data:image%' THEN 'Full data URL (needs cleaning)'
        WHEN thumbnail LIKE 'http%' THEN 'External URL (needs conversion)'
        WHEN LENGTH(thumbnail) > 100 THEN 'Looks like base64'
        ELSE 'Unknown format'
    END as thumbnail_analysis,
    LENGTH(thumbnail) as length
FROM poster_templates
WHERE template_id IS NOT NULL;

-- Clean up thumbnails that have data URL prefixes
-- This removes the "data:image/...;base64," prefix if present
UPDATE poster_templates 
SET thumbnail = SUBSTRING(thumbnail FROM POSITION(',' IN thumbnail) + 1)
WHERE thumbnail LIKE 'data:image%'
    AND POSITION(',' IN thumbnail) > 0;

-- Add some sample base64 thumbnails for testing (small 1x1 pixel images)
-- Red pixel
INSERT INTO poster_templates (
    template_name, 
    template_id, 
    template_uuid, 
    description, 
    category, 
    price, 
    thumbnail,
    fields_required
) VALUES (
    'Sample Red Template',
    'sample-red-001',
    'red-uuid-001',
    'A sample template with red thumbnail for testing',
    'Data',
    0,
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    '[]'::jsonb
) ON CONFLICT (template_id) DO NOTHING;

-- Blue pixel  
INSERT INTO poster_templates (
    template_name, 
    template_id, 
    template_uuid, 
    description, 
    category, 
    price, 
    thumbnail,
    fields_required
) VALUES (
    'Sample Blue Template',
    'sample-blue-002', 
    'blue-uuid-002',
    'A sample template with blue thumbnail for testing',
    'SMS',
    50,
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    '[{"name": "message", "label": "Message", "type": "text", "required": true}]'::jsonb
) ON CONFLICT (template_id) DO NOTHING;

-- Green pixel
INSERT INTO poster_templates (
    template_name, 
    template_id, 
    template_uuid, 
    description, 
    category, 
    price, 
    thumbnail,
    fields_required
) VALUES (
    'Sample Green Template',
    'sample-green-003',
    'green-uuid-003', 
    'A sample template with green thumbnail for testing',
    'Minutes',
    100,
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+fAQAEgAJ/lK3Q6wAAAABJRU5ErkJggg==',
    '[{"name": "title", "label": "Title", "type": "text", "required": true}, {"name": "content", "label": "Content", "type": "textarea", "required": true}]'::jsonb
) ON CONFLICT (template_id) DO NOTHING;

-- Verify the changes
SELECT 
    template_name,
    template_id,
    LENGTH(thumbnail) as thumbnail_length,
    CASE 
        WHEN thumbnail IS NULL THEN '❌ NULL'
        WHEN thumbnail = '' THEN '❌ EMPTY' 
        WHEN LENGTH(thumbnail) < 50 THEN '⚠️ TOO_SHORT'
        WHEN LENGTH(thumbnail) > 100 THEN '✅ VALID_BASE64'
        ELSE '❓ UNKNOWN'
    END as status
FROM poster_templates
ORDER BY template_name;
