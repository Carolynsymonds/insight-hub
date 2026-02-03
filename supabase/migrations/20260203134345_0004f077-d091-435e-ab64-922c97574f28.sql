-- Add column to store additional industry search snippets as JSON array
ALTER TABLE public.leads 
ADD COLUMN industry_snippets_extra jsonb DEFAULT NULL;