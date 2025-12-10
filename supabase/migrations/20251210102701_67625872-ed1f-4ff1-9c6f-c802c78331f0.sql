-- Add must_knows column for storing AI-generated bullet points
ALTER TABLE public.leads ADD COLUMN must_knows text;