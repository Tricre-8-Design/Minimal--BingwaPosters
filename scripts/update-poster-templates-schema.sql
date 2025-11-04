-- Add template_uuid column to poster_templates table
ALTER TABLE poster_templates 
ADD COLUMN IF NOT EXISTS template_uuid TEXT NOT NULL DEFAULT '';

-- Make template_uuid required (not null)
UPDATE poster_templates 
SET template_uuid = template_id || '_uuid' 
WHERE template_uuid = '' OR template_uuid IS NULL;

ALTER TABLE poster_templates 
ALTER COLUMN template_uuid SET NOT NULL;

-- Add unique constraint to template_uuid
ALTER TABLE poster_templates 
ADD CONSTRAINT unique_template_uuid UNIQUE (template_uuid);

-- Update generated_posters table to include template_uuid
ALTER TABLE generated_posters 
ADD COLUMN IF NOT EXISTS template_uuid TEXT;

-- Make template_uuid required in generated_posters
UPDATE generated_posters 
SET template_uuid = template_id 
WHERE template_uuid IS NULL;

ALTER TABLE generated_posters 
ALTER COLUMN template_uuid SET NOT NULL;

-- Add id column as primary key to generated_posters if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_posters' AND column_name = 'id') THEN
        ALTER TABLE generated_posters ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generated_posters_id ON generated_posters(id);
CREATE INDEX IF NOT EXISTS idx_generated_posters_template_uuid ON generated_posters(template_uuid);
CREATE INDEX IF NOT EXISTS idx_poster_templates_template_uuid ON poster_templates(template_uuid);

-- Update RLS policies to allow service role access
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow service role full access to generated_posters" ON generated_posters;
DROP POLICY IF EXISTS "Allow service role full access to poster_templates" ON poster_templates;

-- Create new policies for service role
CREATE POLICY "Allow service role full access to generated_posters" ON generated_posters
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to poster_templates" ON poster_templates
FOR ALL USING (auth.role() = 'service_role');

-- Allow public read access to poster_templates
CREATE POLICY "Allow public read access to poster_templates" ON poster_templates
FOR SELECT USING (true);

-- Allow public read access to generated_posters (for progress tracking)
CREATE POLICY "Allow public read access to generated_posters" ON generated_posters
FOR SELECT USING (true);

-- Additional updates can be added here if necessary
