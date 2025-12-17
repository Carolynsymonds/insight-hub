-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view clay enrichments for their leads" ON public.clay_enrichments;

-- Create new policies allowing all authenticated users to view all records
CREATE POLICY "Authenticated users can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all clay enrichments"
ON public.clay_enrichments
FOR SELECT
TO authenticated
USING (true);