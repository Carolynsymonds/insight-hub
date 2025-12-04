-- Add Instagram columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram_source_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram_confidence numeric;