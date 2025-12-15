-- Add upload_batch column for tracking CSV upload batches
ALTER TABLE public.leads ADD COLUMN upload_batch integer;

-- Create index for efficient filtering by batch
CREATE INDEX idx_leads_upload_batch ON public.leads(upload_batch);