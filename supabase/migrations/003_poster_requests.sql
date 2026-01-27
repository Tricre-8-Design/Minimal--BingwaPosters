-- Create poster_requests table
CREATE TABLE IF NOT EXISTS public.poster_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poster_url TEXT NOT NULL,
    description TEXT,
    phone_number TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'added', 'ignored')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poster_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert requests
CREATE POLICY "Allow anonymous insert on poster_requests" 
ON public.poster_requests 
FOR INSERT 
WITH CHECK (true);

-- Allow authenticated admins to manage requests
CREATE POLICY "Allow admin manage on poster_requests" 
ON public.poster_requests 
FOR ALL 
USING (true);

-- Create storage bucket for poster requests if it doesn't exist
-- Note: Supabase storage buckets are managed via the storage schema
INSERT INTO storage.buckets (id, name, public) 
VALUES ('poster-requests', 'poster-requests', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the poster-requests bucket
-- Allow public to upload to poster-requests
CREATE POLICY "Allow public upload to poster-requests"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'poster-requests');

-- Allow public to read from poster-requests
CREATE POLICY "Allow public read from poster-requests"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'poster-requests');

-- Allow admins to delete from poster-requests
CREATE POLICY "Allow admin delete from poster-requests"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'poster-requests');
