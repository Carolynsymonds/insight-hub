-- Add new columns for company enrichment
ALTER TABLE public.leads 
ADD COLUMN facebook TEXT,
ADD COLUMN founded_date TEXT,
ADD COLUMN logo_url TEXT,
ADD COLUMN products_services TEXT;