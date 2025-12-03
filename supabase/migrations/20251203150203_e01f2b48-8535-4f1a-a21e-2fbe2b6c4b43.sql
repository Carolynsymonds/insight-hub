-- Add email validation and company contacts columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email_domain_validated boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_contacts jsonb DEFAULT '[]'::jsonb;