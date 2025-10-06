/*
  # Fix RLS policies for clients table

  1. Security Changes
    - Drop all existing policies for clients table
    - Enable RLS on clients table
    - Add comprehensive policies for SELECT, INSERT, UPDATE, DELETE operations
    - Ensure Admin users can manage clients
    - Ensure all authenticated users can view clients

  2. Policy Details
    - SELECT: All authenticated users can view clients
    - INSERT: Only Admin users can create clients
    - UPDATE: Only Admin users can update clients  
    - DELETE: Only Admin users can delete clients
*/

-- Drop all existing policies for clients table
DROP POLICY IF EXISTS "Admin and MANG can manage clients" ON public.clients;
DROP POLICY IF EXISTS "CLK and FSSALE can view clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to view clients" ON public.clients;
DROP POLICY IF EXISTS "Allow Admin to create clients" ON public.clients;
DROP POLICY IF EXISTS "Allow Admin to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow Admin to delete clients" ON public.clients;

-- Ensure RLS is enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (Read Access) - All authenticated users can view clients
CREATE POLICY "Allow authenticated users to view clients"
ON public.clients FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT (Create Access) - Only Admin users can create clients
CREATE POLICY "Allow Admin to create clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);

-- Policy for UPDATE (Edit Access) - Only Admin users can update clients
CREATE POLICY "Allow Admin to update clients"
ON public.clients FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);

-- Policy for DELETE (Delete Access) - Only Admin users can delete clients
CREATE POLICY "Allow Admin to delete clients"
ON public.clients FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);