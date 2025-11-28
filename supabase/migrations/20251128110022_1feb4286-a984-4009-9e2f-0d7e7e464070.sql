-- Add MICS columns to leads table
ALTER TABLE public.leads 
ADD COLUMN mics_sector text,
ADD COLUMN mics_subsector text,
ADD COLUMN mics_segment text;