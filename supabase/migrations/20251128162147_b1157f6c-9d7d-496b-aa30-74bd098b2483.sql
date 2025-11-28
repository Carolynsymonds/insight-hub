-- Add match score fields to leads table
ALTER TABLE public.leads 
ADD COLUMN match_score NUMERIC,
ADD COLUMN match_score_source TEXT;