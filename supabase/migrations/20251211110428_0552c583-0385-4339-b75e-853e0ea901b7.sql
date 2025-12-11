-- Drop the existing clay_enrichments table
DROP TABLE IF EXISTS public.clay_enrichments;

-- Create new simplified clay_enrichments table
CREATE TABLE public.clay_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  full_name text,
  email text,
  linkedin text,
  title_clay text,
  company_clay text,
  twitter_url_clay text,
  facebook_url_clay text,
  latest_experience_clay text,
  location_clay text,
  phone_clay text,
  created_at timestamp with time zone DEFAULT now(),
  raw_response jsonb
);

-- Enable RLS
ALTER TABLE public.clay_enrichments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view clay enrichments for their leads"
ON public.clay_enrichments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM leads WHERE leads.id = clay_enrichments.lead_id AND leads.user_id = auth.uid()
));

CREATE POLICY "Users can create clay enrichments for their leads"
ON public.clay_enrichments
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM leads WHERE leads.id = clay_enrichments.lead_id AND leads.user_id = auth.uid()
));