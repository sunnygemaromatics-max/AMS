ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS folder_access_details TEXT;
