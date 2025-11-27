-- Add enrichment_logs column to store detailed Apollo API responses
ALTER TABLE public.leads
ADD COLUMN enrichment_logs JSONB DEFAULT '[]'::jsonb;