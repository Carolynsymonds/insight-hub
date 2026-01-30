-- Create reference table for NAICS codes
CREATE TABLE public.naics_codes (
  naics_code TEXT PRIMARY KEY,
  naics_title TEXT NOT NULL,
  mics_code TEXT,
  mics_title TEXT
);

-- Enable RLS (public read access for reference data)
ALTER TABLE public.naics_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to read
CREATE POLICY "Anyone can read NAICS codes"
ON public.naics_codes
FOR SELECT
USING (true);

-- Add naics_title column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS naics_title TEXT;