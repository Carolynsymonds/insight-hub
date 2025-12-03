-- Add column to store scraped website data for transparency/debugging
ALTER TABLE public.leads 
ADD COLUMN scraped_data_log jsonb DEFAULT null;