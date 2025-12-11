-- Create clay_enrichments table to store Clay enrichment logs
CREATE TABLE public.clay_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Request data
  full_name TEXT,
  email TEXT,
  company TEXT,
  
  -- Enriched contact data
  title TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  latest_experience TEXT,
  email_status TEXT,
  
  -- Organization data
  organization_name TEXT,
  organization_website TEXT,
  organization_industry TEXT,
  
  -- Metadata
  apollo_searched BOOLEAN DEFAULT FALSE,
  twitter_searched BOOLEAN DEFAULT FALSE,
  raw_response JSONB
);

-- Enable RLS
ALTER TABLE public.clay_enrichments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only access enrichments for their own leads
CREATE POLICY "Users can view clay enrichments for their leads"
ON public.clay_enrichments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = clay_enrichments.lead_id 
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create clay enrichments for their leads"
ON public.clay_enrichments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = clay_enrichments.lead_id 
    AND leads.user_id = auth.uid()
  )
);

-- Index for faster lookups by lead_id
CREATE INDEX idx_clay_enrichments_lead_id ON public.clay_enrichments(lead_id);