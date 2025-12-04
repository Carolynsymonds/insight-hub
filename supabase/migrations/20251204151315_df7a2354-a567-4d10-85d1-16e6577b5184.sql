-- Add vehicle-specific fields to leads table
ALTER TABLE public.leads ADD COLUMN vehicles_count text;
ALTER TABLE public.leads ADD COLUMN confirm_vehicles_50_plus text;
ALTER TABLE public.leads ADD COLUMN truck_types text;
ALTER TABLE public.leads ADD COLUMN features text;