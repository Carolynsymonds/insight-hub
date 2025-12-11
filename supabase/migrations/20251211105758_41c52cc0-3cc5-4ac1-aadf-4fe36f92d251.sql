-- Remove unused columns from clay_enrichments table
ALTER TABLE public.clay_enrichments DROP COLUMN IF EXISTS apollo_searched;
ALTER TABLE public.clay_enrichments DROP COLUMN IF EXISTS twitter_searched;