-- Rename size_summary column to size
ALTER TABLE public.leads RENAME COLUMN size_summary TO size;

-- Add new description column for company summary/description
ALTER TABLE public.leads ADD COLUMN description TEXT;