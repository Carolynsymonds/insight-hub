-- Add GPS coordinate fields to leads table
ALTER TABLE public.leads 
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric;