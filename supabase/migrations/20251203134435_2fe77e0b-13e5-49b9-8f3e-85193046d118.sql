-- Add apollo_not_found flag to leads table
ALTER TABLE public.leads ADD COLUMN apollo_not_found boolean DEFAULT false;