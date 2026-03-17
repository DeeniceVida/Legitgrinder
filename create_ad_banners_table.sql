-- Run this script in your Supabase SQL Editor to create the ad_banners table

CREATE TABLE IF NOT EXISTS public.ad_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title1 TEXT NOT NULL,
    title2 TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "buttonLink" TEXT NOT NULL,
    "imageSrc" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on ad_banners"
ON public.ad_banners
FOR SELECT
TO public
USING (true);

-- Allow authenticated users (admin) to manage banners
CREATE POLICY "Allow authenticated users to insert ad_banners"
ON public.ad_banners
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ad_banners"
ON public.ad_banners
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete ad_banners"
ON public.ad_banners
FOR DELETE
TO authenticated
USING (true);

-- Create a storage bucket for banner images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the banners bucket
CREATE POLICY "Allow public read access on banners bucket" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'banners');

CREATE POLICY "Allow authenticated insert on banners bucket" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'banners');

CREATE POLICY "Allow authenticated update on banners bucket" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'banners');

CREATE POLICY "Allow authenticated delete on banners bucket" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'banners');
