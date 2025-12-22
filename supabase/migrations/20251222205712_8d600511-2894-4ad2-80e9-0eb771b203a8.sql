-- Add 'client' to the app_role enum
ALTER TYPE app_role ADD VALUE 'client';

-- Add role column to user_invitations table to store the intended role
ALTER TABLE user_invitations ADD COLUMN role app_role NOT NULL DEFAULT 'user';