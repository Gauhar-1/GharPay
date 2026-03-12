-- Create the storage bucket for property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property_images', 'property_images', true)
ON CONFLICT (id) DO NOTHING;

-- Grant access policies
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'property_images');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property_images');

CREATE POLICY "Authenticated users can delete their uploads if necessary"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property_images');
