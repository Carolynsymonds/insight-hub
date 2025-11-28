-- Add columns for Industry Relevance Score
ALTER TABLE leads ADD COLUMN industry_relevance_score numeric;
ALTER TABLE leads ADD COLUMN industry_relevance_explanation text;

-- Add columns for Vehicle Tracking Interest Score
ALTER TABLE leads ADD COLUMN vehicle_tracking_interest_score numeric;
ALTER TABLE leads ADD COLUMN vehicle_tracking_interest_explanation text;