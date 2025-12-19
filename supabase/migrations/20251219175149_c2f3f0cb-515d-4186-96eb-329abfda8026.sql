-- Create clay_company_enrichment table
CREATE TABLE public.clay_company_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  domain text,
  size_clay text,
  industry_clay text,
  locality_clay text,
  logo_clay text,
  annual_revenue_clay text,
  founded_clay text,
  description_clay text,
  raw_response jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clay_company_enrichment ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view all clay company enrichments"
  ON public.clay_company_enrichment FOR SELECT
  USING (true);

CREATE POLICY "Users can create clay company enrichments for their leads"
  ON public.clay_company_enrichment FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads WHERE leads.id = clay_company_enrichment.lead_id AND leads.user_id = auth.uid()
  ));

CREATE POLICY "Service role can delete clay company enrichments"
  ON public.clay_company_enrichment FOR DELETE
  USING (true);