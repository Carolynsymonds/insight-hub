-- Add long_summary column for detailed company profiles
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS long_summary text;