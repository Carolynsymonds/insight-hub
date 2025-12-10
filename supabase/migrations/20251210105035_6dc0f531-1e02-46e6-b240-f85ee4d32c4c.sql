-- Add likely_business_cases column to leads table
ALTER TABLE public.leads ADD COLUMN likely_business_cases TEXT NULL;