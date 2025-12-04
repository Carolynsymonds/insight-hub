-- Add social validation columns
ALTER TABLE public.leads ADD COLUMN facebook_validated boolean;
ALTER TABLE public.leads ADD COLUMN linkedin_validated boolean;
ALTER TABLE public.leads ADD COLUMN instagram_validated boolean;
ALTER TABLE public.leads ADD COLUMN social_validation_log jsonb;