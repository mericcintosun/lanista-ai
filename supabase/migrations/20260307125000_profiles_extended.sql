-- =============================================================================
-- Profiles Extended: avatar, banner, social links, public URL
-- =============================================================================

-- 1. Ensure profiles table exists (for fresh installs)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text,
  callsign text,
  bio text,
  sector text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add new columns (safe: only adds if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='banner_url') THEN
    ALTER TABLE public.profiles ADD COLUMN banner_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='x_url') THEN
    ALTER TABLE public.profiles ADD COLUMN x_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='discord_url') THEN
    ALTER TABLE public.profiles ADD COLUMN discord_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='website_url') THEN
    ALTER TABLE public.profiles ADD COLUMN website_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='public_username') THEN
    ALTER TABLE public.profiles ADD COLUMN public_username text UNIQUE;
  END IF;
END $$;

-- 3. Create storage bucket for profile media (avatars + banners)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies: users can upload/update/delete only their own folder
DROP POLICY IF EXISTS "Users can upload own profile media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile media" ON storage.objects;
DROP POLICY IF EXISTS "Public read profile media" ON storage.objects;

CREATE POLICY "Users can upload own profile media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own profile media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own profile media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read (bucket is public)
CREATE POLICY "Public read profile media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-media');
