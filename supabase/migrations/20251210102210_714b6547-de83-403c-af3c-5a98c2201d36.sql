-- Add products_services_summary column for AI-generated summary
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS products_services_summary text;