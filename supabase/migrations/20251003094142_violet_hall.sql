/*
  # Fix RLS policies for items table

  1. Security Changes
    - Drop all existing policies for items table
    - Enable RLS on items table
    - Add comprehensive policies for SELECT, INSERT, UPDATE, DELETE operations
    - Ensure Admin users can manage items
    - Ensure all authenticated users can view items

  2. Policy Details
    - SELECT: All authenticated users can view items
    - INSERT: Only Admin users can create items
    - UPDATE: Only Admin users can update items
    - DELETE: Only Admin users can delete items
*/

-- Drop all existing policies for items table
DROP POLICY IF EXISTS "Admin and MANG can manage items" ON public.items;
DROP POLICY IF EXISTS "All authenticated users can view items" ON public.items;
DROP POLICY IF EXISTS "Allow authenticated users to view items" ON public.items;
DROP POLICY IF EXISTS "Allow Admin to create items" ON public.items;
DROP POLICY IF EXISTS "Allow Admin to update items" ON public.items;
DROP POLICY IF EXISTS "Allow Admin to delete items" ON public.items;

-- Ensure RLS is enabled
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (Read Access) - All authenticated users can view items
CREATE POLICY "Allow authenticated users to view items"
ON public.items FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT (Create Access) - Only Admin users can create items
CREATE POLICY "Allow Admin to create items"
ON public.items FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);

-- Policy for UPDATE (Edit Access) - Only Admin users can update items
CREATE POLICY "Allow Admin to update items"
ON public.items FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);

-- Policy for DELETE (Delete Access) - Only Admin users can delete items
CREATE POLICY "Allow Admin to delete items"
ON public.items FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
);