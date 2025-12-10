-- Add columns for lead contact's personal social profiles
ALTER TABLE public.leads 
ADD COLUMN contact_linkedin TEXT,
ADD COLUMN contact_facebook TEXT,
ADD COLUMN contact_youtube TEXT;