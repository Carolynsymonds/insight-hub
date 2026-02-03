-- Add audit columns to leads table
ALTER TABLE public.leads
ADD COLUMN audit_verdict text,
ADD COLUMN audit_why_wrong text,
ADD COLUMN audit_why_right text,
ADD COLUMN audited_at timestamp with time zone;