-- Add diagnosis columns to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS diagnosis_category TEXT,
ADD COLUMN IF NOT EXISTS diagnosis_explanation TEXT,
ADD COLUMN IF NOT EXISTS diagnosis_recommendation TEXT,
ADD COLUMN IF NOT EXISTS diagnosis_confidence TEXT,
ADD COLUMN IF NOT EXISTS diagnosed_at TIMESTAMP WITH TIME ZONE;