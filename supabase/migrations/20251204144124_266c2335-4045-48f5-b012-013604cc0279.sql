-- Add category column to leads table
ALTER TABLE public.leads ADD COLUMN category text NOT NULL DEFAULT 'Vehicles';

-- Update all existing leads to have category "Vehicles" (in case any have different default)
UPDATE public.leads SET category = 'Vehicles';