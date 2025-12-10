-- Create category_roles table for storing target job titles per category
CREATE TABLE public.category_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category, role_name)
);

-- Enable Row-Level Security
ALTER TABLE public.category_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for users to manage their own category roles
CREATE POLICY "Users can view their own category roles"
ON public.category_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own category roles"
ON public.category_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category roles"
ON public.category_roles
FOR DELETE
USING (auth.uid() = user_id);