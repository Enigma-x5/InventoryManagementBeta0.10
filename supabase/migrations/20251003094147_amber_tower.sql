/*
  # Fix RLS policies for users table

  1. Security Changes
    - Drop all existing policies for users table
    - Enable RLS on users table
    - Add policy to allow authenticated users to read user data
    - This is essential for role-based access control

  2. Policy Details
    - SELECT: All authenticated users can view user data (needed for role checks)
*/

-- Drop all existing policies for users table
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Allow anon to read users for login" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read their own role for policy che" ON public.users;
DROP POLICY IF EXISTS "INSECURE: Allow anon to select all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read user data" ON public.users;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (Read Access) - All authenticated users can read user data
-- This is necessary for the RLS policies on other tables to work properly
CREATE POLICY "Allow authenticated users to read user data"
ON public.users FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to read users for login purposes
CREATE POLICY "Allow anon to read users for login"
ON public.users FOR SELECT
TO anon
USING (true);