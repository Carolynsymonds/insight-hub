-- Add NAICS classification columns to leads table
ALTER TABLE public.leads 
ADD COLUMN naics_code text,
ADD COLUMN naics_confidence integer;