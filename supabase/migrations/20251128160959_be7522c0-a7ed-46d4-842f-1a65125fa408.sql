-- Add domain relevance score column to leads table
ALTER TABLE public.leads ADD COLUMN domain_relevance_score numeric;
ALTER TABLE public.leads ADD COLUMN domain_relevance_explanation text;