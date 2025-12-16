-- Add profile match evaluation columns to clay_enrichments table
ALTER TABLE public.clay_enrichments 
ADD COLUMN IF NOT EXISTS profile_match_score INTEGER,
ADD COLUMN IF NOT EXISTS profile_match_confidence TEXT,
ADD COLUMN IF NOT EXISTS profile_match_reasons JSONB,
ADD COLUMN IF NOT EXISTS profile_match_evaluated_at TIMESTAMPTZ;