-- Add contact email fields for deep scraping results
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_email_personal boolean DEFAULT false;