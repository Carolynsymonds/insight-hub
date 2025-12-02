-- Add source_url column to store full URL path found during enrichment
ALTER TABLE leads ADD COLUMN source_url text;